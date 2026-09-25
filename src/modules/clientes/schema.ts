import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "@/db/schema/tenancy";

/** Texto que substitui `name` num cliente anonimizado (`anonymizeCliente`,
 * ver `actions.ts`) — usado tanto ao gravar quanto pela UI para reconhecer
 * um registro já anonimizado sem depender só de `anonymizedAt !== null`.
 * Vive aqui (não em `actions.ts`, um arquivo `"use server"`) porque um
 * arquivo `"use server"` só pode exportar async functions. */
export const CLIENTE_ANONIMIZADO_NOME = "Cliente removido (LGPD)";

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
    // Preenchido por `anonymizeCliente` (LGPD, direito à eliminação —
    // Art. 18, VI). Não NULO = os campos acima já foram sobrescritos e o
    // registro só existe para manter a integridade referencial de
    // `pedidos.customerId` (onDelete: "restrict"); a UI trata isso como
    // "Cliente removido", nunca oferece editar de novo. Ver
    // docs/lgpd-checklist.md.
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
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
