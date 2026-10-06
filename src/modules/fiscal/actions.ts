"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireModule } from "@/core/auth";
import { lookupCep, type CepResult } from "@/core/cep";
import type { ActionResult } from "@/core/action-result";
import { fiscalCredentials, fiscalNotas } from "./schema";
import { resolveFiscalProvider } from "./resolve-provider";
import {
  buildEmitentePayload,
  buildFiscalItemPayload,
  validarClienteParaNota,
  validarEmitente,
  validarItensParaNota,
  type PedidoItemLike,
} from "./domain";
import type { FiscalClientePayload } from "./provider";
import { runCancelamento, runEmissaoParaPedido } from "./run-emissao";
import { encryptApiKeyPlaceholder } from "./crypto-placeholder";
import { parseFiscalCredentialsFormData } from "./validation";

export interface EmitirNotaFiscalInput {
  pedidoId: string;
  pedidoNumber: number;
  cliente: FiscalClientePayload;
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
  const { organizationId, log, withDb } = await requireModule("fiscal");
  log.info("fiscal.emitir", { pedidoId: input.pedidoId });

  if (input.itens.length === 0) {
    return { ok: false, message: "Pedido sem itens para emitir nota fiscal." };
  }

  // Falta de dado fiscal do cliente vira mensagem clara, não erro do provedor.
  const faltando = validarClienteParaNota(input.cliente, input.itens);
  if (faltando.length > 0) {
    return {
      ok: false,
      message: `Complete o cadastro do cliente para emitir a nota: ${faltando.join("; ")}.`,
    };
  }

  const [credentials] = await withDb((tx) =>
    tx
      .select()
      .from(fiscalCredentials)
      .where(eq(fiscalCredentials.organizationId, organizationId))
      .limit(1),
  );
  const emitente = buildEmitentePayload(credentials);
  const pendenciasEmitente = [
    ...validarEmitente(emitente, input.itens),
    ...validarItensParaNota(input.itens.map((i) => buildFiscalItemPayload(i, emitente))),
  ];
  if (pendenciasEmitente.length > 0) {
    return {
      ok: false,
      message: `Complete a configuração fiscal (menu Fiscal) ou o cadastro do item: ${pendenciasEmitente.join("; ")}.`,
    };
  }
  const provider = resolveFiscalProvider(credentials?.providerSlug);

  // Núcleo puro (sem banco), testável com um provider fake — ver
  // `run-emissao.ts`. Este trecho só persiste o resultado.
  const emissoes = await runEmissaoParaPedido(
    {
      organizationId,
      pedidoId: input.pedidoId,
      pedidoNumber: input.pedidoNumber,
      emitente,
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
  const { organizationId, log, withDb } = await requireModule("fiscal");

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

/** Autocomplete de endereço da empresa por CEP (ViaCEP). Exige sessão. */
export async function buscarCepEmitente(cep: string): Promise<CepResult | null> {
  await requireModule("fiscal");
  return lookupCep(cep);
}

export async function saveFiscalCredentials(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { organizationId, log, withDb } = await requireModule("fiscal");

  const parsed = parseFiscalCredentialsFormData(formData);
  if (!parsed.success) {
    log.warn("fiscal.credenciais.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { apiKey, issRate, ...fields } = parsed.data;
  // Campo vazio vira NULL (senão `undefined` no upsert manteria o valor antigo
  // e o usuário nunca conseguiria limpar um campo).
  const rest = {
    ...Object.fromEntries(
      Object.entries({ ...fields, issRateBps: issRate }).map(([k, v]) => [k, v ?? null]),
    ),
    cnpj: fields.cnpj ? fields.cnpj.replace(/\D/g, "") : null,
    zip: fields.zip ? fields.zip.replace(/\D/g, "") : null,
    state: fields.state ? fields.state.toUpperCase() : null,
  };

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

/**
 * Apaga TODAS as notas (de qualquer status, incluindo "emitida") de um
 * pedido — chamado só pela orquestração de exclusão de pedido
 * (`app/(app)/pedidos/[id]/delete-actions.ts`), nunca direto pela UI.
 * `fiscal_notas.pedidoId` é `onDelete: "restrict"`, então apagar o
 * pedido exige apagar as notas primeiro; a UI avisa antes se alguma
 * nota já foi emitida de verdade (ver `FiscalNotasList`/warning na
 * página de detalhe do pedido) — aqui só executa o que já foi
 * confirmado, sem checar de novo.
 */
export async function deleteFiscalNotasForPedido(pedidoId: string): Promise<ActionResult> {
  const { organizationId, log, withDb } = await requireModule("fiscal");

  await withDb((db) =>
    db
      .delete(fiscalNotas)
      .where(
        and(eq(fiscalNotas.pedidoId, pedidoId), eq(fiscalNotas.organizationId, organizationId)),
      ),
  );

  log.info("fiscal.notas.apagar_do_pedido", { pedidoId });
  return { ok: true };
}
