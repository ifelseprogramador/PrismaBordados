import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "@/db/schema/tenancy";

/**
 * Catálogo de itens do vertical bordados — específico deste ramo (nome
 * `catalogo-bordado`, não `catalogo` genérico, ver docs/decisoes.md).
 * `defaultPriceCents` é só uma SUGESTÃO pré-preenchida no item do pedido:
 * o valor real é digitado à mão, porque bordado varia por complexidade
 * (ver `modules/pedidos/schema.ts#pedidoItens.unitPriceCents`).
 */
export const catalogoBordadoItens = pgTable(
  "catalogo_bordado_itens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    // Tipo de produto (texto livre — ex.: "toalha", "camiseta", "boné",
    // "jaleco"): a variedade de produtos que uma bordadeira aceita é
    // grande demais para um enum fechado no MVP.
    tipoProduto: text("tipo_produto").notNull(),
    modeloPadrao: text("modelo_padrao"),
    tamanhosAceitos: text("tamanhos_aceitos").array().notNull().default([]),
    coresAceitas: text("cores_aceitas").array().notNull().default([]),
    defaultPriceCents: integer("default_price_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("catalogo_bordado_itens_organization_id_idx").on(table.organizationId),
    index("catalogo_bordado_itens_tipo_produto_idx").on(table.organizationId, table.tipoProduto),
  ],
);

export const catalogoBordadoItensRelations = relations(catalogoBordadoItens, ({ one }) => ({
  organization: one(organizations, {
    fields: [catalogoBordadoItens.organizationId],
    references: [organizations.id],
  }),
}));
