"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { recordLgpdAction } from "@/core/audit-log";
import type { ActionResult } from "@/core/action-result";
import { clientes, CLIENTE_ANONIMIZADO_NOME } from "./schema";
import { parseClienteFormData } from "./validation";

export interface InsertResult extends ActionResult {
  id?: string;
}

export async function createCliente(
  _prevState: ActionResult,
  formData: FormData,
): Promise<InsertResult> {
  const { organizationId, log, withDb } = await withOrg();

  const parsed = parseClienteFormData(formData);
  if (!parsed.success) {
    log.warn("clientes.criar.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const [cliente] = await withDb((tx) =>
    tx
      .insert(clientes)
      .values({ ...parsed.data, organizationId })
      .returning({ id: clientes.id }),
  );
  log.info("clientes.criar.sucesso", { clienteId: cliente.id });

  revalidatePath("/clientes");
  return { ok: true, id: cliente.id };
}

export async function updateCliente(
  clienteId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { organizationId, log, withDb } = await withOrg();

  const parsed = parseClienteFormData(formData);
  if (!parsed.success) {
    log.warn("clientes.atualizar.validacao_falhou", {
      clienteId,
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const result = await withDb((tx) =>
    tx
      .update(clientes)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(
        and(
          eq(clientes.id, clienteId),
          eq(clientes.organizationId, organizationId),
          // Nunca reescreve um cliente já anonimizado (LGPD) — mesma
          // regra que a UI aplica escondendo o form, aqui como defesa
          // contra um POST direto na action. `isNull` importado abaixo.
          isNull(clientes.anonymizedAt),
        ),
      )
      .returning({ id: clientes.id }),
  );

  if (result.length === 0) {
    log.warn("clientes.atualizar.nao_encontrado", { clienteId });
    return { ok: false, message: "Cliente não encontrado ou já anonimizado (LGPD)." };
  }

  log.info("clientes.atualizar.sucesso", { clienteId });
  revalidatePath("/clientes");
  return { ok: true };
}

export async function deleteCliente(clienteId: string): Promise<ActionResult> {
  const { organizationId, userId, log, withDb } = await withOrg();

  await withDb(async (tx) => {
    await tx
      .delete(clientes)
      .where(and(eq(clientes.id, clienteId), eq(clientes.organizationId, organizationId)));
    await recordLgpdAction(tx, {
      organizationId,
      performedBy: userId,
      action: "delete",
      subjectTable: "clientes",
      subjectId: clienteId,
    });
  });

  log.info("clientes.remover.sucesso", { clienteId });
  revalidatePath("/clientes");
  return { ok: true };
}

/**
 * Direito à eliminação (LGPD, Art. 18, VI). Diferente de `deleteCliente`
 * (DELETE de verdade, só possível quando nenhum `pedido` referencia o
 * cliente — `onDelete: "restrict"`): aqui os campos pessoais são
 * sobrescritos, mas a LINHA continua existindo, porque `pedidos` (prova
 * fiscal/contábil, com prazo de guarda legal — Art. 16 da LGPD permite
 * reter dado além do pedido de eliminação quando há obrigação legal) não
 * pode ficar com uma FK quebrada. A decisão de qual das duas chamar
 * (`deleteCliente` vs. `anonymizeCliente`) é da camada de orquestração —
 * ver `app/(app)/clientes/[id]/privacy-actions.ts`, que consulta
 * `pedidos` antes de escolher (este módulo não pode importar `pedidos`,
 * regra 8 de `src/modules/README.md`).
 */
export async function anonymizeCliente(clienteId: string): Promise<ActionResult> {
  const { organizationId, userId, log, withDb } = await withOrg();

  const result = await withDb(async (tx) => {
    const rows = await tx
      .update(clientes)
      .set({
        name: CLIENTE_ANONIMIZADO_NOME,
        document: null,
        phone: "",
        address: null,
        email: null,
        anonymizedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(clientes.id, clienteId), eq(clientes.organizationId, organizationId)))
      .returning({ id: clientes.id });

    if (rows.length === 0) return rows;

    await recordLgpdAction(tx, {
      organizationId,
      performedBy: userId,
      action: "anonymize",
      subjectTable: "clientes",
      subjectId: clienteId,
    });
    return rows;
  });

  if (result.length === 0) {
    log.warn("clientes.anonimizar.nao_encontrado", { clienteId });
    return { ok: false, message: "Cliente não encontrado." };
  }

  log.info("clientes.anonimizar.sucesso", { clienteId });
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}
