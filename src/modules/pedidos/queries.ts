import "server-only";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { clientes } from "@/modules/clientes/schema";
import { pedidoItens, pedidoStatusEnum, pedidos } from "./schema";

export const PEDIDO_SORT_OPTIONS = {
  number_desc: "Nº (mais recente primeiro)",
  number_asc: "Nº (mais antigo primeiro)",
  total_desc: "Total (maior primeiro)",
  total_asc: "Total (menor primeiro)",
} as const;
export type PedidoSort = keyof typeof PEDIDO_SORT_OPTIONS;

const PEDIDO_ORDER_BY = {
  number_desc: desc(pedidos.number),
  number_asc: asc(pedidos.number),
  total_desc: desc(pedidos.totalCents),
  total_asc: asc(pedidos.totalCents),
} as const;

export type PedidoStatusFilter = (typeof pedidoStatusEnum.enumValues)[number];

/** Resumo pro painel (`(app)/page.tsx`): contagem por status e saldo a
 * receber (soma de `saldoCents` de pedidos NÃO terminais — um pedido
 * cancelado nunca conta como "a receber", ver docs/decisoes.md). */
export async function getPedidosDashboardSummary() {
  const { organizationId, withDb } = await withOrg();

  return withDb(async (tx) => {
    const [statusCounts, [aReceber], recent] = await Promise.all([
      tx
        .select({ status: pedidos.status, count: sql<number>`count(*)::int` })
        .from(pedidos)
        .where(eq(pedidos.organizationId, organizationId))
        .groupBy(pedidos.status),
      tx
        .select({ saldoCents: sql<number>`coalesce(sum(${pedidos.saldoCents}), 0)::int` })
        .from(pedidos)
        .where(
          and(
            eq(pedidos.organizationId, organizationId),
            sql`${pedidos.status} not in ('entregue', 'cancelado')`,
          ),
        ),
      tx
        .select({
          id: pedidos.id,
          number: pedidos.number,
          status: pedidos.status,
          totalCents: pedidos.totalCents,
          createdAt: pedidos.createdAt,
          customerName: clientes.name,
        })
        .from(pedidos)
        .innerJoin(clientes, eq(clientes.id, pedidos.customerId))
        .where(eq(pedidos.organizationId, organizationId))
        .orderBy(desc(pedidos.number))
        .limit(6),
    ]);

    const byStatus = Object.fromEntries(
      pedidoStatusEnum.enumValues.map((status) => [
        status,
        statusCounts.find((row) => row.status === status)?.count ?? 0,
      ]),
    ) as Record<PedidoStatusFilter, number>;

    return {
      byStatus,
      openCount: byStatus.orcamento + byStatus.aprovado + byStatus.em_producao + byStatus.pronto,
      awaitingApprovalCount: byStatus.orcamento,
      inProgressCount: byStatus.em_producao,
      receivableCents: aReceber?.saldoCents ?? 0,
      recent,
    };
  });
}

export async function listPedidos(options?: {
  search?: string;
  status?: PedidoStatusFilter;
  sort?: PedidoSort;
}) {
  const { organizationId, withDb } = await withOrg();

  const term = options?.search?.trim();
  const conditions = [eq(pedidos.organizationId, organizationId)];
  if (term) {
    const numberTerm = Number(term);
    conditions.push(
      or(
        ilike(clientes.name, `%${term}%`),
        Number.isInteger(numberTerm) ? eq(pedidos.number, numberTerm) : sql`false`,
      )!,
    );
  }
  if (options?.status) {
    conditions.push(eq(pedidos.status, options.status));
  }

  return withDb((tx) =>
    tx
      .select({
        id: pedidos.id,
        number: pedidos.number,
        status: pedidos.status,
        totalCents: pedidos.totalCents,
        adiantamentoCents: pedidos.adiantamentoCents,
        saldoCents: pedidos.saldoCents,
        deliveryDate: pedidos.deliveryDate,
        createdAt: pedidos.createdAt,
        customerName: clientes.name,
      })
      .from(pedidos)
      .innerJoin(clientes, eq(clientes.id, pedidos.customerId))
      .where(and(...conditions))
      .orderBy(PEDIDO_ORDER_BY[options?.sort ?? "number_desc"]),
  );
}

export async function getPedidoById(id: string) {
  const { organizationId, withDb } = await withOrg();

  return withDb(async (tx) => {
    const [pedido] = await tx
      .select({
        id: pedidos.id,
        organizationId: pedidos.organizationId,
        number: pedidos.number,
        customerId: pedidos.customerId,
        orderDate: pedidos.orderDate,
        deliveryDate: pedidos.deliveryDate,
        deliveryTime: pedidos.deliveryTime,
        status: pedidos.status,
        totalCents: pedidos.totalCents,
        adiantamentoCents: pedidos.adiantamentoCents,
        saldoCents: pedidos.saldoCents,
        approvedAt: pedidos.approvedAt,
        startedAt: pedidos.startedAt,
        readyAt: pedidos.readyAt,
        deliveredAt: pedidos.deliveredAt,
        cancelledAt: pedidos.cancelledAt,
        createdAt: pedidos.createdAt,
        updatedAt: pedidos.updatedAt,
        customerName: clientes.name,
        customerPhone: clientes.phone,
        customerDocument: clientes.document,
        customerAddress: clientes.address,
      })
      .from(pedidos)
      .innerJoin(clientes, eq(clientes.id, pedidos.customerId))
      .where(and(eq(pedidos.id, id), eq(pedidos.organizationId, organizationId)))
      .limit(1);

    return pedido ?? null;
  });
}

export async function listPedidoItens(pedidoId: string) {
  const { organizationId, withDb } = await withOrg();

  // `pedido_itens` não tem `organization_id` próprio — o join com
  // `pedidos` garante o isolamento por tenant mesmo se este método for
  // chamado direto (sem passar primeiro por `getPedidoById`).
  return withDb((tx) =>
    tx
      .select({
        id: pedidoItens.id,
        pedidoId: pedidoItens.pedidoId,
        catalogoItemId: pedidoItens.catalogoItemId,
        produto: pedidoItens.produto,
        modelo: pedidoItens.modelo,
        tamanho: pedidoItens.tamanho,
        cor: pedidoItens.cor,
        quantity: pedidoItens.quantity,
        unitPriceCents: pedidoItens.unitPriceCents,
        totalCents: pedidoItens.totalCents,
        createdAt: pedidoItens.createdAt,
      })
      .from(pedidoItens)
      .innerJoin(pedidos, eq(pedidos.id, pedidoItens.pedidoId))
      .where(and(eq(pedidoItens.pedidoId, pedidoId), eq(pedidos.organizationId, organizationId)))
      .orderBy(asc(pedidoItens.createdAt)),
  );
}
