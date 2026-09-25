import "server-only";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
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

/** Conjunto de status que os KPIs "Pedidos em aberto" e "Saldo a receber"
 * do painel somam — qualquer pedido que ainda não chegou num estado
 * terminal. Exportado para o card do painel poder linkar direto para a
 * lista já filtrada com o mesmo critério (`/pedidos?status=aberto`, ver
 * `listPedidos` abaixo). */
export const PEDIDOS_ABERTOS_STATUSES = [
  "orcamento",
  "aprovado",
  "em_producao",
  "pronto",
] as const satisfies readonly PedidoStatusFilter[];

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

/**
 * Todos os pedidos de um cliente, sem paginação/filtro — usado pela
 * orquestração de LGPD (`app/(app)/clientes/[id]/privacy-actions.ts`)
 * para: (1) decidir se um cliente pode ser DELETADO de verdade (nenhum
 * pedido) ou só ANONIMIZADO (`customerId` tem FK `onDelete: "restrict"`);
 * (2) montar o export de portabilidade de dados do titular.
 */
export async function listPedidosByClienteId(clienteId: string) {
  const { organizationId, withDb } = await withOrg();

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
      })
      .from(pedidos)
      .where(and(eq(pedidos.organizationId, organizationId), eq(pedidos.customerId, clienteId)))
      .orderBy(desc(pedidos.number)),
  );
}

export interface ClienteComSaldoAReceber {
  clienteId: string;
  clienteName: string;
  /** Soma de `saldoCents` de todos os pedidos NÃO cancelados do cliente —
   * diferente do KPI "Saldo a receber" do painel (que também exclui
   * `entregue`, ver `domain.ts#isReceivableStatus`): aqui é dívida de
   * verdade, um pedido entregue com saldo em aberto conta (ver
   * `domain.ts#isDebtStatus`). */
  totalDevidoCents: number;
  /** Soma de `adiantamentoCents` dos mesmos pedidos — quanto o cliente já
   * pagou do que deve no total (não é "tudo que ele já pagou na vida",
   * pedidos já quitados não entram porque não têm saldo em aberto). */
  totalPagoCents: number;
  /** Menor `paymentDueDate` entre os pedidos do cliente com saldo em
   * aberto — `null` se nenhum pedido em aberto tem vencimento definido. */
  proximoVencimento: string | null;
  /** true se QUALQUER pedido em aberto do cliente já passou do
   * `paymentDueDate` — ver `domain.ts#isOverdue` para a mesma regra do
   * lado da aplicação (usada em testes sem banco). */
  atrasado: boolean;
  /** Os próprios pedidos com saldo em aberto do cliente (nunca vazio,
   * dado o `HAVING` de `totalDevidoCents > 0`) — o painel linka direto
   * para cada um, não só para a ficha do cliente. */
  pedidosEmAberto: { id: string; number: number; saldoCents: number }[];
}

/**
 * Clientes com saldo em aberto — base da seção "Clientes devendo" do
 * painel. Só entra cliente com `totalDevidoCents > 0` (HAVING). Pedido
 * `cancelado` nunca conta (`isDebtStatus`); todos os outros contam,
 * incluindo `entregue` — ver comentário de `totalDevidoCents` acima.
 */
export async function listClientesComSaldoAReceber(): Promise<ClienteComSaldoAReceber[]> {
  const { organizationId, withDb } = await withOrg();

  return withDb((tx) =>
    tx
      .select({
        clienteId: pedidos.customerId,
        clienteName: clientes.name,
        totalDevidoCents: sql<number>`coalesce(sum(${pedidos.saldoCents}), 0)::int`,
        totalPagoCents: sql<number>`coalesce(sum(${pedidos.adiantamentoCents}), 0)::int`,
        proximoVencimento: sql<
          string | null
        >`min(${pedidos.paymentDueDate}) filter (where ${pedidos.saldoCents} > 0)`,
        atrasado: sql<boolean>`bool_or(${pedidos.paymentDueDate} < current_date and ${pedidos.saldoCents} > 0)`,
        pedidosEmAberto: sql<
          { id: string; number: number; saldoCents: number }[]
        >`coalesce(json_agg(json_build_object('id', ${pedidos.id}, 'number', ${pedidos.number}, 'saldoCents', ${pedidos.saldoCents}) order by ${pedidos.number}) filter (where ${pedidos.saldoCents} > 0), '[]')`,
      })
      .from(pedidos)
      .innerJoin(clientes, eq(clientes.id, pedidos.customerId))
      .where(and(eq(pedidos.organizationId, organizationId), sql`${pedidos.status} != 'cancelado'`))
      .groupBy(pedidos.customerId, clientes.name)
      .having(sql`coalesce(sum(${pedidos.saldoCents}), 0) > 0`)
      .orderBy(
        sql`bool_or(${pedidos.paymentDueDate} < current_date and ${pedidos.saldoCents} > 0) desc`,
        sql`sum(${pedidos.saldoCents}) desc`,
      ),
  );
}

export interface PrevisaoRecebimentos {
  /** Soma de `saldoCents` de pedidos com `paymentDueDate` entre hoje e
   * daqui a 30 dias (inclusive) — dinheiro que tem data pra entrar.
   * NUNCA inclui atrasado (isso já é "Clientes devendo") nem pedido sem
   * vencimento definido (não dá pra prever quando entra). */
  proximos30DiasCents: number;
  /** Saldo em aberto SEM `paymentDueDate` definido — existe, mas não
   * entra em `proximos30DiasCents` porque não há data pra projetar.
   * Mostrado à parte no painel como ressalva, nunca somado ao resto (ver
   * docs/decisoes.md, "previsão de caixa"). */
  semPrevisaoCents: number;
}

/**
 * Base da seção "Previsão de caixa" do painel — só o lado de ENTRADAS
 * (pedidos com saldo a receber). O lado de saídas vem de
 * `financeiro#getPrevisaoDespesas`, composto junto na página (nenhum dos
 * dois módulos importa o outro, mesmo padrão de sempre).
 */
export async function getPrevisaoRecebimentos(): Promise<PrevisaoRecebimentos> {
  const { organizationId, withDb } = await withOrg();

  return withDb(async (tx) => {
    const [row] = await tx
      .select({
        proximos30DiasCents: sql<number>`coalesce(sum(${pedidos.saldoCents}) filter (
          where ${pedidos.paymentDueDate} is not null
            and ${pedidos.paymentDueDate} >= current_date
            and ${pedidos.paymentDueDate} <= current_date + 30
        ), 0)::int`,
        semPrevisaoCents: sql<number>`coalesce(sum(${pedidos.saldoCents}) filter (
          where ${pedidos.paymentDueDate} is null
        ), 0)::int`,
      })
      .from(pedidos)
      .where(
        and(
          eq(pedidos.organizationId, organizationId),
          sql`${pedidos.status} != 'cancelado'`,
          sql`${pedidos.saldoCents} > 0`,
        ),
      );

    return {
      proximos30DiasCents: row?.proximos30DiasCents ?? 0,
      semPrevisaoCents: row?.semPrevisaoCents ?? 0,
    };
  });
}

export async function listPedidos(options?: {
  search?: string;
  /** Filtro por um único status (valor real do enum). */
  status?: PedidoStatusFilter;
  /** Filtro por um conjunto de status (ex. `PEDIDOS_ABERTOS_STATUSES`) —
   * usado pelo link do card "Pedidos em aberto"/"Saldo a receber" do
   * painel, que não corresponde a um único valor do enum. Se ambos
   * `status` e `statusIn` forem passados, `statusIn` prevalece. */
  statusIn?: readonly PedidoStatusFilter[];
  /** Só pedidos com saldo em aberto e `paymentDueDate` entre hoje e daqui
   * a 30 dias — MESMO filtro de `getPrevisaoRecebimentos#proximos30DiasCents`,
   * usado pela página `/pedidos?previsao=30dias` (link de "A receber" na
   * Previsão de caixa do painel, pra mostrar exatamente quais pedidos
   * compõem aquele número). Ignora `status`/`statusIn` se passado junto.
   */
  vencimentoProximos30Dias?: boolean;
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
  if (options?.vencimentoProximos30Dias) {
    conditions.push(
      sql`${pedidos.status} != 'cancelado'`,
      sql`${pedidos.saldoCents} > 0`,
      sql`${pedidos.paymentDueDate} is not null`,
      sql`${pedidos.paymentDueDate} >= current_date`,
      sql`${pedidos.paymentDueDate} <= current_date + 30`,
    );
  } else if (options?.statusIn) {
    conditions.push(inArray(pedidos.status, options.statusIn));
  } else if (options?.status) {
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
        paymentDueDate: pedidos.paymentDueDate,
        deliveryDate: pedidos.deliveryDate,
        createdAt: pedidos.createdAt,
        customerName: clientes.name,
      })
      .from(pedidos)
      .innerJoin(clientes, eq(clientes.id, pedidos.customerId))
      .where(and(...conditions))
      .orderBy(
        options?.vencimentoProximos30Dias
          ? sql`${pedidos.paymentDueDate} asc`
          : PEDIDO_ORDER_BY[options?.sort ?? "number_desc"],
      ),
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
        paymentDueDate: pedidos.paymentDueDate,
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
