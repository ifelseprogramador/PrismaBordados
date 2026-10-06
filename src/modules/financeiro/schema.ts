import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  date,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { organizations } from "@/db/schema/tenancy";
import { auditColumns } from "@/db/schema/audit";

export const financeiroLancamentoTypeEnum = pgEnum("financeiro_lancamento_type", [
  "entrada",
  "saida",
]);

export const financeiroLancamentoCategoriaEnum = pgEnum("financeiro_lancamento_categoria", [
  "venda",
  "adiantamento",
  "saldo_recebido",
  "compra_material",
  "despesa_fixa",
  "outro",
]);

export const financeiroLancamentoReferenceTypeEnum = pgEnum(
  "financeiro_lancamento_reference_type",
  ["pedido", "manual"],
);

/**
 * Lançamento financeiro (entrada ou saída) — módulo genérico o bastante
 * para qualquer PJ (candidato a promoção pro BaseERP, ver
 * docs/decisoes.md). `referenceId` é um vínculo OPCIONAL e SEM foreign
 * key de verdade com `pedidos` — decisão deliberada (ver
 * docs/decisoes.md, "financeiro_lancamentos.referenceId sem FK"):
 * `financeiro` não pode depender de `modules/pedidos/schema.ts` porque
 * isso o prenderia ao vertical bordados, travando a promoção futura pro
 * BaseERP (onde `pedidos` nem existe). A integridade referencial nesse
 * caso é responsabilidade da camada de orquestração
 * (`app/(app)/pedidos/[id]/financeiro-actions.ts`), não do banco.
 */
export const financeiroLancamentos = pgTable(
  "financeiro_lancamentos",
  {
    ...auditColumns,
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    type: financeiroLancamentoTypeEnum("type").notNull(),
    categoria: financeiroLancamentoCategoriaEnum("categoria").notNull(),
    amountCents: integer("amount_cents").notNull(),
    date: date("date").notNull(),
    description: text("description"),
    // Vínculo opcional e desacoplado (sem FK, ver comentário acima).
    // "pedido" quando criado pela orquestração de recebimento de pedido;
    // "manual" para lançamentos digitados diretamente aqui.
    referenceType: financeiroLancamentoReferenceTypeEnum("reference_type"),
    referenceId: uuid("reference_id"),
    // Chave de idempotência do formulário que criou o lançamento (gerada
    // no navegador, uma por abertura do formulário): reenviar o MESMO
    // formulário (duplo clique, duas abas, retry) não lança duas vezes. Só
    // vale para lançamentos criados pelo fluxo de pagamento de cliente;
    // nulo nos demais.
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("financeiro_lancamentos_organization_id_idx").on(table.organizationId),
    index("financeiro_lancamentos_org_date_idx").on(table.organizationId, table.date),
    index("financeiro_lancamentos_reference_idx").on(table.referenceType, table.referenceId),
    uniqueIndex("financeiro_lancamentos_org_idempotency_unique")
      .on(table.organizationId, table.idempotencyKey)
      .where(sql`idempotency_key is not null`),
  ],
);

export const financeiroLancamentosRelations = relations(financeiroLancamentos, ({ one }) => ({
  organization: one(organizations, {
    fields: [financeiroLancamentos.organizationId],
    references: [organizations.id],
  }),
}));
