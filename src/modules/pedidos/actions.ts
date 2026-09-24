"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import type { Database } from "@/core/db";
import type { ActionResult } from "@/core/action-result";
import {
  calculateOrderTotal,
  isAdiantamentoAboveTotal,
  isValidTransition,
  type PedidoStatus,
} from "./domain";
import { pedidoCounters, pedidoItens, pedidos } from "./schema";
import {
  parseAdiantamentoFormData,
  parsePedidoHeaderFormData,
  parsePedidoItemFormData,
  type PedidoHeaderInput,
} from "./validation";

export interface InsertResult extends ActionResult {
  id?: string;
}

/** Recalcula e grava o total do pedido a partir dos itens atuais —
 * chamado depois de toda mutação de item, nunca calculado só no cliente
 * (o total gravado é sempre a fonte da verdade). */
async function recalculateOrderTotal(tx: Database, pedidoId: string) {
  const items = await tx
    .select({ quantity: pedidoItens.quantity, unitPriceCents: pedidoItens.unitPriceCents })
    .from(pedidoItens)
    .where(eq(pedidoItens.pedidoId, pedidoId));

  const totalCents = calculateOrderTotal(
    items.map((item) => ({ quantity: Number(item.quantity), unitPriceCents: item.unitPriceCents })),
  );

  await tx
    .update(pedidos)
    .set({ totalCents, updatedAt: new Date() })
    .where(eq(pedidos.id, pedidoId));
  return totalCents;
}

export async function createPedidoRecord(data: PedidoHeaderInput): Promise<InsertResult> {
  const { organizationId, log, withDb } = await withOrg();
  log.info("pedidos.criar");

  return withDb(async (tx) => {
    // Upsert atômico: uma única instrução, sem corrida entre dois pedidos
    // criados ao mesmo tempo na mesma organização (ver comentário em
    // schema.ts#pedidoCounters).
    const [{ lastNumber }] = await tx
      .insert(pedidoCounters)
      .values({ organizationId, lastNumber: 1 })
      .onConflictDoUpdate({
        target: pedidoCounters.organizationId,
        set: { lastNumber: sql`${pedidoCounters.lastNumber} + 1` },
      })
      .returning({ lastNumber: pedidoCounters.lastNumber });

    const [pedido] = await tx
      .insert(pedidos)
      .values({ ...data, organizationId, number: lastNumber })
      .returning({ id: pedidos.id });

    log.info("pedidos.criar.sucesso", { pedidoId: pedido.id, number: lastNumber });
    return { ok: true, id: pedido.id };
  });
}

export async function createPedido(
  _prevState: ActionResult,
  formData: FormData,
): Promise<InsertResult> {
  const { log } = await withOrg();
  const parsed = parsePedidoHeaderFormData(formData);
  if (!parsed.success) {
    log.warn("pedidos.criar.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  return createPedidoRecord(parsed.data);
}

export async function updatePedidoHeader(
  pedidoId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { organizationId, log, withDb } = await withOrg();
  log.info("pedidos.atualizar", { pedidoId });

  const parsed = parsePedidoHeaderFormData(formData);
  if (!parsed.success) {
    log.warn("pedidos.atualizar.validacao_falhou", {
      pedidoId,
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const result = await withDb((tx) =>
    tx
      .update(pedidos)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(pedidos.id, pedidoId), eq(pedidos.organizationId, organizationId)))
      .returning({ id: pedidos.id }),
  );

  if (result.length === 0) {
    log.warn("pedidos.atualizar.nao_encontrado", { pedidoId });
    return { ok: false, message: "Pedido não encontrado." };
  }

  log.info("pedidos.atualizar.sucesso", { pedidoId });
  revalidatePath(`/pedidos/${pedidoId}`);
  return { ok: true };
}

export async function addPedidoItem(
  pedidoId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { organizationId, log, withDb } = await withOrg();
  log.info("pedidos.item.adicionar", { pedidoId });

  const parsed = parsePedidoItemFormData(formData);
  if (!parsed.success) {
    log.warn("pedidos.item.adicionar.validacao_falhou", {
      pedidoId,
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const result = await withDb(async (tx) => {
    const [pedido] = await tx
      .select({ id: pedidos.id })
      .from(pedidos)
      .where(and(eq(pedidos.id, pedidoId), eq(pedidos.organizationId, organizationId)))
      .limit(1);
    if (!pedido) return null;

    await tx.insert(pedidoItens).values({
      pedidoId,
      catalogoItemId: parsed.data.catalogoItemId,
      produto: parsed.data.produto,
      modelo: parsed.data.modelo,
      tamanho: parsed.data.tamanho,
      cor: parsed.data.cor,
      quantity: String(parsed.data.quantity),
      unitPriceCents: parsed.data.unitPriceCents,
    });

    await recalculateOrderTotal(tx, pedidoId);
    return pedido;
  });

  if (!result) {
    log.warn("pedidos.item.adicionar.pedido_nao_encontrado", { pedidoId });
    return { ok: false, message: "Pedido não encontrado." };
  }

  log.info("pedidos.item.adicionar.sucesso", { pedidoId });
  revalidatePath(`/pedidos/${pedidoId}`);
  return { ok: true };
}

export async function removePedidoItem(itemId: string, pedidoId: string): Promise<ActionResult> {
  const { organizationId, log, withDb } = await withOrg();
  log.info("pedidos.item.remover", { itemId, pedidoId });

  const result = await withDb(async (tx) => {
    const [pedido] = await tx
      .select({ id: pedidos.id })
      .from(pedidos)
      .where(and(eq(pedidos.id, pedidoId), eq(pedidos.organizationId, organizationId)))
      .limit(1);
    if (!pedido) return null;

    await tx
      .delete(pedidoItens)
      .where(and(eq(pedidoItens.id, itemId), eq(pedidoItens.pedidoId, pedidoId)));

    await recalculateOrderTotal(tx, pedidoId);
    return pedido;
  });

  if (!result) {
    log.warn("pedidos.item.remover.pedido_nao_encontrado", { pedidoId });
    return { ok: false, message: "Pedido não encontrado." };
  }

  log.info("pedidos.item.remover.sucesso", { itemId, pedidoId });
  revalidatePath(`/pedidos/${pedidoId}`);
  return { ok: true };
}

/**
 * Registra o adiantamento agregado (soma dos recebimentos) de um pedido.
 * NÃO cria um lançamento individual — isso é trabalho do futuro módulo
 * `financeiro` (fora de escopo aqui, ver docs/decisoes.md), que quando
 * existir vai orquestrar essa chamada + o lançamento próprio a partir de
 * uma Server Action fina em `app/(app)/pedidos/[id]/actions.ts` (fora dos
 * dois módulos, já que nenhum pode importar o outro).
 */
export async function registerAdiantamento(
  pedidoId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { organizationId, log, withDb } = await withOrg();
  log.info("pedidos.adiantamento.registrar", { pedidoId });

  const parsed = parseAdiantamentoFormData(formData);
  if (!parsed.success) {
    log.warn("pedidos.adiantamento.validacao_falhou", {
      pedidoId,
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const result = await withDb((tx) =>
    tx
      .update(pedidos)
      .set({ adiantamentoCents: parsed.data.adiantamentoCents, updatedAt: new Date() })
      .where(and(eq(pedidos.id, pedidoId), eq(pedidos.organizationId, organizationId)))
      .returning({ id: pedidos.id, totalCents: pedidos.totalCents }),
  );

  const [pedido] = result;
  if (!pedido) {
    log.warn("pedidos.adiantamento.nao_encontrado", { pedidoId });
    return { ok: false, message: "Pedido não encontrado." };
  }

  if (isAdiantamentoAboveTotal(pedido.totalCents, parsed.data.adiantamentoCents)) {
    log.warn("pedidos.adiantamento.acima_do_total", { pedidoId });
  }

  log.info("pedidos.adiantamento.sucesso", { pedidoId });
  revalidatePath(`/pedidos/${pedidoId}`);
  return { ok: true };
}

const STATUS_ACTION_LABEL: Record<string, string> = {
  aprovado: "pedidos.aprovar",
  em_producao: "pedidos.iniciar_producao",
  pronto: "pedidos.marcar_pronto",
  entregue: "pedidos.entregar",
  cancelado: "pedidos.cancelar",
};

const STATUS_TIMESTAMP_FIELD: Partial<
  Record<PedidoStatus, "approvedAt" | "startedAt" | "readyAt" | "deliveredAt" | "cancelledAt">
> = {
  aprovado: "approvedAt",
  em_producao: "startedAt",
  pronto: "readyAt",
  entregue: "deliveredAt",
  cancelado: "cancelledAt",
};

export async function transitionPedidoStatus(
  pedidoId: string,
  nextStatus: PedidoStatus,
): Promise<ActionResult> {
  const { organizationId, log, withDb } = await withOrg();
  const actionName = STATUS_ACTION_LABEL[nextStatus] ?? "pedidos.transicao";
  log.info(actionName, { pedidoId, nextStatus });

  const result = await withDb(async (tx) => {
    const [pedido] = await tx
      .select({ id: pedidos.id, status: pedidos.status })
      .from(pedidos)
      .where(and(eq(pedidos.id, pedidoId), eq(pedidos.organizationId, organizationId)))
      .limit(1);
    if (!pedido) return { kind: "not_found" as const };

    if (!isValidTransition(pedido.status, nextStatus)) {
      return { kind: "invalid" as const, from: pedido.status };
    }

    const timestampField = STATUS_TIMESTAMP_FIELD[nextStatus];
    await tx
      .update(pedidos)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
        ...(timestampField && { [timestampField]: new Date() }),
      })
      .where(eq(pedidos.id, pedidoId));

    return { kind: "ok" as const };
  });

  if (result.kind === "not_found") {
    log.warn(`${actionName}.nao_encontrado`, { pedidoId });
    return { ok: false, message: "Pedido não encontrado." };
  }
  if (result.kind === "invalid") {
    log.warn(`${actionName}.transicao_invalida`, { pedidoId, de: result.from, para: nextStatus });
    return {
      ok: false,
      message: `Não é possível mudar de "${result.from}" para "${nextStatus}".`,
    };
  }

  log.info(`${actionName}.sucesso`, { pedidoId });
  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
  return { ok: true };
}
