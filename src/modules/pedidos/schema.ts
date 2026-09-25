import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  date,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { organizations } from "@/db/schema/tenancy";
import { clientes } from "@/modules/clientes/schema";
import { catalogoBordadoItens } from "@/modules/catalogo-bordado/schema";

/**
 * Orçamento não é uma entidade separada: é um `pedido` com
 * `status = 'orcamento'`. Transições válidas (ver `domain.ts#isValidTransition`,
 * testado sem banco):
 *   orcamento -> aprovado | cancelado
 *   aprovado -> em_producao | cancelado
 *   em_producao -> pronto | cancelado
 *   pronto -> entregue | cancelado
 *   entregue, cancelado: terminais.
 */
export const pedidoStatusEnum = pgEnum("pedido_status", [
  "orcamento",
  "aprovado",
  "em_producao",
  "pronto",
  "entregue",
  "cancelado",
]);

/**
 * Contador do número sequencial do pedido, um por organização — não dá
 * pra usar uma SEQUENCE nativa do Postgres (é global, não por tenant); um
 * upsert atômico (`INSERT ... ON CONFLICT DO UPDATE ... RETURNING`)
 * cumpre o mesmo papel sem corrida entre dois pedidos criados ao mesmo
 * tempo na mesma organização (ver `mecano-erp/src/modules/ordens/schema.ts#workOrderCounters`).
 */
export const pedidoCounters = pgTable("pedido_counters", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  lastNumber: integer("last_number").notNull().default(0),
});

export const pedidos = pgTable(
  "pedidos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    number: integer("number").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "restrict" }),
    orderDate: date("order_date").notNull(),
    deliveryDate: date("delivery_date"),
    // Horário de entrega combinado (texto livre tipo "14:30" — o formulário
    // físico só registra um horário aproximado, não um timestamp exato).
    deliveryTime: text("delivery_time"),
    status: pedidoStatusEnum("status").notNull().default("orcamento"),
    // Total é recalculado pela aplicação (soma dos itens) a cada mutação
    // de item — não é coluna gerada porque depende de uma tabela filha
    // (pedido_itens), que o Postgres não permite referenciar num
    // GENERATED ALWAYS AS. Ver domain.ts#calculateOrderTotal.
    totalCents: integer("total_cents").notNull().default(0),
    // Total já recebido (soma de recebimentos) — campo AGREGADO, não um
    // valor único; cada recebimento individual vira um lançamento no
    // módulo `financeiro` (fase futura, fora de escopo aqui — ver
    // docs/decisoes.md). Atualizado pela aplicação sempre que um
    // recebimento é registrado.
    adiantamentoCents: integer("adiantamento_cents").notNull().default(0),
    // Até quando o SALDO (não o total) precisa ser pago — diferente de
    // `deliveryDate` (quando a peça fica pronta/é entregue): um cliente
    // pode receber o pedido e só terminar de pagar depois. Opcional,
    // definido junto do registro de adiantamento/pagamento
    // (`AdiantamentoForm`) — ver `domain.ts#isOverdue` e
    // `queries.ts#listClientesComSaldoAReceber`, usado pelo painel.
    paymentDueDate: date("payment_due_date"),
    // Coluna gerada de verdade (ao contrário de totalCents): depende só
    // de colunas da própria linha (total - adiantamento), nunca fica
    // negativa na exibição (a aplicação também nunca deve deixar
    // adiantamentoCents > totalCents sem avisar — ver domain.ts#calculateSaldo).
    saldoCents: integer("saldo_cents").generatedAlwaysAs(sql`total_cents - adiantamento_cents`),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("pedidos_organization_id_idx").on(table.organizationId),
    index("pedidos_customer_id_idx").on(table.customerId),
    index("pedidos_status_idx").on(table.status),
    uniqueIndex("pedidos_org_number_unique").on(table.organizationId, table.number),
  ],
);

export const pedidoItens = pgTable(
  "pedido_itens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pedidoId: uuid("pedido_id")
      .notNull()
      .references(() => pedidos.id, { onDelete: "cascade" }),
    // Opcional: referência ao item de catálogo usado só para
    // pré-preencher o form — o cliente pode trazer peça própria, sem
    // nenhum item de catálogo por trás (ver domain do plano).
    catalogoItemId: uuid("catalogo_item_id").references(() => catalogoBordadoItens.id, {
      onDelete: "set null",
    }),
    // Texto livre: o produto em si (ex.: "toalha de banho", "camiseta
    // trazida pelo cliente") — nem sempre corresponde a um item de
    // catálogo.
    produto: text("produto").notNull(),
    modelo: text("modelo"),
    tamanho: text("tamanho"),
    cor: text("cor"),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
    unitPriceCents: integer("unit_price_cents").notNull(),
    // Coluna gerada: só depende de colunas da própria linha.
    totalCents: integer("total_cents").generatedAlwaysAs(sql`round(quantity * unit_price_cents)`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("pedido_itens_pedido_id_idx").on(table.pedidoId)],
);

export const pedidosRelations = relations(pedidos, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [pedidos.organizationId],
    references: [organizations.id],
  }),
  customer: one(clientes, { fields: [pedidos.customerId], references: [clientes.id] }),
  items: many(pedidoItens),
}));

export const pedidoItensRelations = relations(pedidoItens, ({ one }) => ({
  pedido: one(pedidos, { fields: [pedidoItens.pedidoId], references: [pedidos.id] }),
  catalogoItem: one(catalogoBordadoItens, {
    fields: [pedidoItens.catalogoItemId],
    references: [catalogoBordadoItens.id],
  }),
}));
