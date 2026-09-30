import { pgTable, pgEnum, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { organizations } from "@/db/schema/tenancy";

/** Texto que substitui `name` num cliente anonimizado (`anonymizeCliente`,
 * ver `actions.ts`) — usado tanto ao gravar quanto pela UI para reconhecer
 * um registro já anonimizado sem depender só de `anonymizedAt !== null`.
 * Vive aqui (não em `actions.ts`, um arquivo `"use server"`) porque um
 * arquivo `"use server"` só pode exportar async functions. */
export const CLIENTE_ANONIMIZADO_NOME = "Cliente removido (LGPD)";

export const clienteTypeEnum = pgEnum("cliente_type", ["pf", "pj"]);
export const clienteIeIndicatorEnum = pgEnum("cliente_ie_indicator", [
  "contribuinte",
  "isento",
  "nao_contribuinte",
]);
export const clienteEnderecoKindEnum = pgEnum("cliente_endereco_kind", [
  "principal",
  "cobranca",
  "entrega",
]);

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
    type: clienteTypeEnum("type").notNull().default("pf"),
    name: text("name").notNull(),
    // Dados exigidos na emissão de NF-e/NFS-e (todos opcionais no cadastro;
    // a exigência é checada na hora de emitir, ver `modules/fiscal`).
    legalName: text("legal_name"),
    tradeName: text("trade_name"),
    ieIndicator: clienteIeIndicatorEnum("ie_indicator").notNull().default("nao_contribuinte"),
    ie: text("ie"),
    im: text("im"),
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

/** Endereços estruturados do cliente (NF-e exige logradouro, número, bairro,
 * município, UF, CEP e código IBGE). O form edita só o `principal`. */
export const clienteEnderecos = pgTable(
  "cliente_enderecos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    clienteId: uuid("cliente_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "cascade" }),
    kind: clienteEnderecoKindEnum("kind").notNull().default("principal"),
    zip: text("zip"),
    street: text("street"),
    number: text("number"),
    complement: text("complement"),
    district: text("district"),
    city: text("city"),
    state: text("state"),
    // Código IBGE do município (7 dígitos).
    ibgeCode: text("ibge_code"),
    countryCode: text("country_code").notNull().default("1058"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cliente_enderecos_organization_id_idx").on(table.organizationId),
    index("cliente_enderecos_cliente_id_idx").on(table.clienteId),
    uniqueIndex("cliente_enderecos_principal_uq")
      .on(table.clienteId)
      .where(sql`${table.kind} = 'principal'`),
  ],
);

export const clientesRelations = relations(clientes, ({ one }) => ({
  organization: one(organizations, {
    fields: [clientes.organizationId],
    references: [organizations.id],
  }),
}));
