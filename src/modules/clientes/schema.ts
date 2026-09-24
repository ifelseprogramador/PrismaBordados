import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "@/db/schema/tenancy";

/**
 * Cadastro de clientes — genérico o bastante para qualquer ramo (ver
 * docs/decisoes.md, "onde `clientes` ficou"). Campos mapeados do plano:
 * nome, documento (CPF/CNPJ, validado via `core/document.ts`), telefone,
 * endereço, e-mail opcional.
 */
export const clientes = pgTable(
  "clientes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    // CPF ou CNPJ, dígitos apenas (ver core/document.ts#isValidDocument).
    document: text("document"),
    phone: text("phone").notNull(),
    address: text("address"),
    email: text("email"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("clientes_organization_id_idx").on(table.organizationId),
    index("clientes_name_idx").on(table.name),
  ],
);

export const clientesRelations = relations(clientes, ({ one }) => ({
  organization: one(organizations, {
    fields: [clientes.organizationId],
    references: [organizations.id],
  }),
}));
