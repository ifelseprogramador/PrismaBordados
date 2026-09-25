"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import type { ActionResult } from "@/core/action-result";
import { fiscalCredentials, fiscalNotas } from "./schema";
import { resolveFiscalProvider } from "./resolve-provider";
import type { PedidoItemLike } from "./domain";
import { runCancelamento, runEmissaoParaPedido } from "./run-emissao";
import { encryptApiKeyPlaceholder } from "./crypto-placeholder";
import { parseFiscalCredentialsFormData } from "./validation";

export interface EmitirNotaFiscalInput {
  pedidoId: string;
  pedidoNumber: number;
  cliente: { nome: string; documento?: string; endereco?: string; email?: string };
  itens: PedidoItemLike[];
}

/**
 * Emite nota(s) fiscal(is) para um pedido — chamada pela orquestração
 * fina em `app/(app)/pedidos/[id]/fiscal-actions.ts` (que monta
 * `itens`/`cliente` a partir dos barrels de `pedidos` e `clientes`; este
 * módulo nunca importa nenhum dos dois, ver regra de acoplamento).
 *
 * Um pedido com itens de venda E serviço gera NF-e e NFS-e SEPARADAS,
 * cada uma com seu próprio `fiscal_notas`. Nunca deixa o provedor quebrar
 * o pedido: qualquer erro (do provider "não configurado" ou de uma
 * implementação real que vier a lançar) vira `status = 'erro'` +
 * `errorMessage` gravado em `fiscal_notas`, nunca um `throw` que escapa
 * daqui.
 */
export async function emitirNotaFiscal(input: EmitirNotaFiscalInput): Promise<ActionResult> {
  const { organizationId, log, withDb } = await withOrg();
  log.info("fiscal.emitir", { pedidoId: input.pedidoId });

  if (input.itens.length === 0) {
    return { ok: false, message: "Pedido sem itens para emitir nota fiscal." };
  }

  const [credentials] = await withDb((tx) =>
    tx
      .select({ providerSlug: fiscalCredentials.providerSlug })
      .from(fiscalCredentials)
      .where(eq(fiscalCredentials.organizationId, organizationId))
      .limit(1),
  );
  const provider = resolveFiscalProvider(credentials?.providerSlug);

  // Núcleo puro (sem banco), testável com um provider fake — ver
  // `run-emissao.ts`. Este trecho só persiste o resultado.
  const emissoes = await runEmissaoParaPedido(
    {
      organizationId,
      pedidoId: input.pedidoId,
      pedidoNumber: input.pedidoNumber,
      cliente: input.cliente,
      itens: input.itens,
    },
    provider,
  );

  if (emissoes.length === 0) {
    return { ok: false, message: "Pedido sem itens para emitir nota fiscal." };
  }

  for (const { tipo, resultado } of emissoes) {
    await withDb((tx) =>
      tx.insert(fiscalNotas).values({
        organizationId,
        pedidoId: input.pedidoId,
        tipo,
        status: resultado.status,
        providerNotaId: resultado.providerNotaId,
        xmlUrl: resultado.xmlUrl,
        pdfUrl: resultado.pdfUrl,
        errorMessage: resultado.errorMessage,
      }),
    );

    if (resultado.status === "erro") {
      log.warn("fiscal.emitir.nota_com_erro", {
        pedidoId: input.pedidoId,
        tipo,
        errorMessage: resultado.errorMessage,
      });
    }
  }

  log.info("fiscal.emitir.concluido", { pedidoId: input.pedidoId });
  revalidatePath(`/pedidos/${input.pedidoId}`);
  return { ok: true };
}

export async function cancelarNotaFiscal(notaId: string, motivo: string): Promise<ActionResult> {
  const { organizationId, log, withDb } = await withOrg();

  const [nota] = await withDb((tx) =>
    tx
      .select()
      .from(fiscalNotas)
      .where(and(eq(fiscalNotas.id, notaId), eq(fiscalNotas.organizationId, organizationId)))
      .limit(1),
  );
  if (!nota) {
    return { ok: false, message: "Nota não encontrada." };
  }

  const [credentials] = await withDb((tx) =>
    tx
      .select({ providerSlug: fiscalCredentials.providerSlug })
      .from(fiscalCredentials)
      .where(eq(fiscalCredentials.organizationId, organizationId))
      .limit(1),
  );
  const provider = resolveFiscalProvider(credentials?.providerSlug);
  const resultado = await runCancelamento(nota.providerNotaId, motivo, provider);

  if (!resultado.ok) {
    log.warn("fiscal.cancelar.falhou", { notaId, errorMessage: resultado.errorMessage });
    return { ok: false, message: resultado.errorMessage ?? "Não foi possível cancelar a nota." };
  }

  await withDb((tx) =>
    tx
      .update(fiscalNotas)
      .set({ status: "cancelada", updatedAt: new Date() })
      .where(eq(fiscalNotas.id, notaId)),
  );

  log.info("fiscal.cancelar.sucesso", { notaId });
  revalidatePath(`/pedidos/${nota.pedidoId}`);
  return { ok: true };
}

export async function saveFiscalCredentials(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { organizationId, log, withDb } = await withOrg();

  const parsed = parseFiscalCredentialsFormData(formData);
  if (!parsed.success) {
    log.warn("fiscal.credenciais.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { apiKey, ...rest } = parsed.data;

  await withDb((tx) =>
    tx
      .insert(fiscalCredentials)
      .values({
        organizationId,
        ...rest,
        apiKeyEncrypted: apiKey ? encryptApiKeyPlaceholder(apiKey) : undefined,
      })
      .onConflictDoUpdate({
        target: fiscalCredentials.organizationId,
        set: {
          ...rest,
          ...(apiKey && { apiKeyEncrypted: encryptApiKeyPlaceholder(apiKey) }),
          updatedAt: new Date(),
        },
      }),
  );

  log.info("fiscal.credenciais.salvar.sucesso");
  revalidatePath("/fiscal");
  return { ok: true };
}
