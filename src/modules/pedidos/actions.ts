"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { requireModule } from "@/core/auth";
import type { Database } from "@/core/db";
import type { ActionResult } from "@/core/action-result";
import { recordStatusChange } from "@/core/status-history";
import {
  calculateOrderTotal,
  isAdiantamentoAboveTotal,
  isValidTransition,
  type PedidoStatus,
} from "./domain";
import { aplicarAdiantamento, somarAdiantamento } from "./adiantamento-tx";
import { pedidoCounters, pedidoItens, pedidos } from "./schema";
import {
  parseAdiantamentoFormData,
  parsePedidoCreateFormData,
  parsePedidoHeaderFormData,
  parsePedidoItemFormData,
  type PedidoCreateInput,
} from "./validation";

export interface InsertResult extends ActionResult {
  id?: string;
}

const CONFLICT_MESSAGE =
  "Este pedido foi alterado por outra pessoa enquanto você editava. Atualize a página e tente de novo.";

/**
 * Trava a linha do pedido (`SELECT ... FOR UPDATE`) até o fim da transação
 * e devolve o estado atual. Toda mutação do pedido (cabeçalho, item, status)
 * começa por aqui: duas pessoas mexendo no mesmo pedido se enfileiram em vez
 * de se atropelar — a segunda lê o estado já gravado pela primeira (cada
 * instrução em READ COMMITTED enxerga o que foi confirmado), então o total
 * recalculado nunca perde um item adicionado ao mesmo tempo.
 */
async function lockPedido(tx: Database, pedidoId: string, organizationId: string) {
  const [pedido] = await tx
    .select({
      id: pedidos.id,
      status: pedidos.status,
      headerVersion: pedidos.headerVersion,
    })
    .from(pedidos)
    .where(and(eq(pedidos.id, pedidoId), eq(pedidos.organizationId, organizationId)))
    .limit(1)
    .for("update");
  return pedido ?? null;
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

export async function createPedidoRecord(data: PedidoCreateInput): Promise<InsertResult> {
  const { organizationId, userId, log, withDb } = await requireModule("pedidos");
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

    await recordStatusChange(tx, {
      organizationId,
      userId,
      entityTable: "pedidos",
      entityId: pedido.id,
      fromStatus: null,
      toStatus: "orcamento",
    });

    log.info("pedidos.criar.sucesso", { pedidoId: pedido.id, number: lastNumber });
    return { ok: true, id: pedido.id };
  });
}

export async function createPedido(
  _prevState: ActionResult,
  formData: FormData,
): Promise<InsertResult> {
  const { log } = await requireModule("pedidos");
  const parsed = parsePedidoCreateFormData(formData);
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
  const { organizationId, log, withDb } = await requireModule("pedidos");
  log.info("pedidos.atualizar", { pedidoId });

  const parsed = parsePedidoHeaderFormData(formData);
  if (!parsed.success) {
    log.warn("pedidos.atualizar.validacao_falhou", {
      pedidoId,
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  // Versão que a pessoa estava vendo (campo oculto `headerVersion`). Quando
  // o formulário a envia, conflito de edição simultânea é detectado.
  const rawVersion = formData.get("headerVersion");
  const expectedVersion = rawVersion === null || rawVersion === "" ? null : Number(rawVersion);

  const outcome = await withDb(async (tx) => {
    const pedido = await lockPedido(tx, pedidoId, organizationId);
    if (!pedido) return "not_found" as const;
    if (expectedVersion !== null && pedido.headerVersion !== expectedVersion) {
      return "conflict" as const;
    }

    await tx
      .update(pedidos)
      .set({
        ...parsed.data,
        headerVersion: sql`${pedidos.headerVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(pedidos.id, pedidoId));
    return "ok" as const;
  });

  if (outcome === "not_found") {
    log.warn("pedidos.atualizar.nao_encontrado", { pedidoId });
    return { ok: false, message: "Pedido não encontrado." };
  }
  if (outcome === "conflict") {
    log.warn("pedidos.atualizar.conflito", { pedidoId });
    return { ok: false, message: CONFLICT_MESSAGE };
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
  const { organizationId, log, withDb } = await requireModule("pedidos");
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
    const pedido = await lockPedido(tx, pedidoId, organizationId);
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
  const { organizationId, log, withDb } = await requireModule("pedidos");
  log.info("pedidos.item.remover", { itemId, pedidoId });

  const result = await withDb(async (tx) => {
    const pedido = await lockPedido(tx, pedidoId, organizationId);
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
  const { organizationId, log, withDb } = await requireModule("pedidos");
  log.info("pedidos.adiantamento.registrar", { pedidoId });

  const parsed = parseAdiantamentoFormData(formData);
  if (!parsed.success) {
    log.warn("pedidos.adiantamento.validacao_falhou", {
      pedidoId,
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const rawVersion = formData.get("headerVersion");
  const expectedVersion =
    rawVersion === null || rawVersion === "" ? Number.NaN : Number(rawVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    return { ok: false, message: "Não foi possível salvar. Atualize a página e tente de novo." };
  }

  const result = await withDb((tx) =>
    aplicarAdiantamento(tx, {
      organizationId,
      pedidoId,
      adiantamentoCents: parsed.data.adiantamentoCents,
      paymentDueDate: parsed.data.paymentDueDate ?? null,
      expectedVersion,
    }),
  );

  if (result.kind === "not_found") {
    log.warn("pedidos.adiantamento.nao_encontrado", { pedidoId });
    return { ok: false, message: "Pedido não encontrado." };
  }
  if (result.kind === "conflict") {
    log.warn("pedidos.adiantamento.conflito", { pedidoId });
    return { ok: false, message: CONFLICT_MESSAGE };
  }
  const pedido = { totalCents: result.totalCents };

  if (isAdiantamentoAboveTotal(pedido.totalCents, parsed.data.adiantamentoCents)) {
    log.warn("pedidos.adiantamento.acima_do_total", { pedidoId });
  }

  log.info("pedidos.adiantamento.sucesso", { pedidoId });
  revalidatePath(`/pedidos/${pedidoId}`);
  return { ok: true };
}

export interface IncrementarAdiantamentoResult extends ActionResult {
  adiantamentoCents?: number;
  saldoCents?: number;
}

/**
 * Soma um valor ao adiantamento já registrado (DELTA, não o novo total) —
 * diferente de `registerAdiantamento` (que grava um total absoluto vindo
 * do form da ficha do pedido). Usado pela orquestração que registra
 * pagamento de cliente a partir de `/financeiro`
 * (`app/(app)/financeiro/pagamento-cliente-actions.ts`), onde o valor
 * natural digitado é "quanto está sendo pago agora". Nunca toca em
 * `paymentDueDate` — não há campo de vencimento nesse fluxo.
 */
export async function incrementarAdiantamento(
  pedidoId: string,
  valorCents: number,
): Promise<IncrementarAdiantamentoResult> {
  const { organizationId, log, withDb } = await requireModule("pedidos");

  const pedido = await withDb((tx) =>
    somarAdiantamento(tx, { organizationId, pedidoId, valorCents }),
  );
  if (!pedido) {
    log.warn("pedidos.adiantamento.incrementar.nao_encontrado", { pedidoId });
    return { ok: false, message: "Pedido não encontrado." };
  }

  log.info("pedidos.adiantamento.incrementar.sucesso", { pedidoId, valorCents });
  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
  return {
    ok: true,
    adiantamentoCents: pedido.adiantamentoCents,
    saldoCents: pedido.saldoCents ?? undefined,
  };
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
  const { organizationId, userId, log, withDb } = await requireModule("pedidos");
  const actionName = STATUS_ACTION_LABEL[nextStatus] ?? "pedidos.transicao";
  log.info(actionName, { pedidoId, nextStatus });

  const result = await withDb(async (tx) => {
    // Linha travada: se outra pessoa está mudando o status (ou mexendo em
    // item) deste mesmo pedido, esperamos ela terminar e validamos a
    // transição contra o status que ficou — nunca contra um status velho.
    const pedido = await lockPedido(tx, pedidoId, organizationId);
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

    await recordStatusChange(tx, {
      organizationId,
      userId,
      entityTable: "pedidos",
      entityId: pedidoId,
      fromStatus: pedido.status,
      toStatus: nextStatus,
    });

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

export interface DeletePedidoResult extends ActionResult {
  customerId?: string;
}

/**
 * Apaga o pedido e os itens dele (`pedido_itens.pedidoId` é `onDelete:
 * "cascade"`, some sozinho). NÃO mexe em `fiscal_notas` — quem chama
 * isto (`app/(app)/pedidos/[id]/delete-actions.ts`) precisa apagar as
 * notas primeiro (`fiscal_notas.pedidoId` é `onDelete: "restrict"`,
 * bloqueia este delete se sobrar alguma). Devolve `customerId` pra quem
 * chamou decidir se o cliente (se já anonimizado/LGPD e sem mais nenhum
 * outro pedido) também deve ser apagado — isso é orquestração entre
 * módulos, não cabe aqui.
 */
export async function deletePedido(pedidoId: string): Promise<DeletePedidoResult> {
  const { organizationId, log, withDb } = await requireModule("pedidos");
  log.info("pedidos.apagar", { pedidoId });

  const result = await withDb(async (tx) => {
    const [pedido] = await tx
      .select({ id: pedidos.id, customerId: pedidos.customerId })
      .from(pedidos)
      .where(and(eq(pedidos.id, pedidoId), eq(pedidos.organizationId, organizationId)))
      .limit(1);
    if (!pedido) return null;

    await tx.delete(pedidos).where(eq(pedidos.id, pedidoId));
    return pedido;
  });

  if (!result) {
    log.warn("pedidos.apagar.nao_encontrado", { pedidoId });
    return { ok: false, message: "Pedido não encontrado." };
  }

  log.info("pedidos.apagar.sucesso", { pedidoId });
  revalidatePath("/pedidos");
  return { ok: true, customerId: result.customerId };
}
