import { pgTable, pgEnum, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "@/db/schema/tenancy";
import { pedidos } from "@/modules/pedidos/schema";

export const fiscalNotaTipoEnum = pgEnum("fiscal_nota_tipo", ["nfe", "nfse"]);
export const fiscalNotaStatusEnum = pgEnum("fiscal_nota_status", [
  "pendente",
  "emitida",
  "erro",
  "cancelada",
]);

/**
 * Credenciais de emissão fiscal, uma linha por organização
 * (`organizationId` é a própria PK — unique por design). `providerSlug`
 * fica vazio/null até a organização escolher um provedor (decisão
 * adiada pelo usuário, ver docs/decisoes.md — nenhum provedor concreto é
 * implementado nesta fase). `providerConfig` em `jsonb` guarda campos
 * específicos do provedor futuro sem exigir uma migration de schema
 * quando ele for escolhido.
 *
 * `apiKeyEncrypted` NUNCA é texto puro — ver
 * `crypto-placeholder.ts#encryptApiKeyPlaceholder` (placeholder
 * reversível, documentadamente insuficiente para produção) — e está na
 * lista de `redact()` do logger (`core/logger.ts`).
 */
export const fiscalCredentials = pgTable("fiscal_credentials", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  providerSlug: text("provider_slug"),
  apiKeyEncrypted: text("api_key_encrypted"),
  cnpj: text("cnpj"),
  regimeTributario: text("regime_tributario"),
  serieNota: text("serie_nota"),
  providerConfig: jsonb("provider_config"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Notas emitidas para um pedido — 1:N de propósito: um pedido com itens
 * de venda (peça pronta) E de serviço (bordado sobre peça do cliente)
 * gera uma NF-e e uma NFS-e SEPARADAS, ambas apontando pro mesmo
 * `pedidoId` (ver `domain.ts#splitItensPorOperacao`).
 *
 * FK real para `pedidos` (via `@/modules/pedidos/schema`) — exceção
 * documentada `schema.ts` → `schema.ts` (ver docs/decisoes.md e
 * `src/modules/README.md`, regra 8): aqui faz sentido, ao contrário de
 * `financeiro_lancamentos.referenceId` (solto, sem FK), porque
 * `fiscal_notas` é conceitualmente filha de um pedido específico (nunca
 * existe fora desse contexto), enquanto um lançamento financeiro é uma
 * entidade que faz sentido sozinha.
 */
export const fiscalNotas = pgTable(
  "fiscal_notas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    pedidoId: uuid("pedido_id")
      .notNull()
      .references(() => pedidos.id, { onDelete: "restrict" }),
    tipo: fiscalNotaTipoEnum("tipo").notNull(),
    status: fiscalNotaStatusEnum("status").notNull().default("pendente"),
    providerNotaId: text("provider_nota_id"),
    xmlUrl: text("xml_url"),
    pdfUrl: text("pdf_url"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("fiscal_notas_organization_id_idx").on(table.organizationId),
    index("fiscal_notas_pedido_id_idx").on(table.pedidoId),
  ],
);

export const fiscalCredentialsRelations = relations(fiscalCredentials, ({ one }) => ({
  organization: one(organizations, {
    fields: [fiscalCredentials.organizationId],
    references: [organizations.id],
  }),
}));

export const fiscalNotasRelations = relations(fiscalNotas, ({ one }) => ({
  organization: one(organizations, {
    fields: [fiscalNotas.organizationId],
    references: [organizations.id],
  }),
  pedido: one(pedidos, { fields: [fiscalNotas.pedidoId], references: [pedidos.id] }),
}));
