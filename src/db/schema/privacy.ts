import { pgTable, pgEnum, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./tenancy";

/** Prazo mínimo de guarda de documento fiscal no Brasil (prescrição
 * tributária, CTN Art. 173/174) — uma organização não pode configurar
 * `retentionYears` abaixo disso. Ver `core/privacy/settings.ts` e
 * docs/lgpd-checklist.md. */
export const LGPD_MIN_RETENTION_YEARS = 5;

/**
 * Dados de conformidade LGPD PRÓPRIOS de cada organização — cada uma é
 * controladora dos dados dos seus clientes (Prisma é multi-tenant: cada
 * organização é uma empresa de bordado diferente, com seu próprio CNPJ e
 * encarregado). Uma linha por organização, "sem linha" = ainda não
 * preenchido (mesmo padrão de `organization_backup_settings`) — `core/
 * privacy/settings.ts#getPrivacySettings` devolve um objeto com campos
 * vazios e `retentionYears = LGPD_MIN_RETENTION_YEARS` nesse caso, nunca
 * `null`/`undefined` solto pela UI.
 */
export const organizationPrivacySettings = pgTable("organization_privacy_settings", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  legalName: text("legal_name"),
  cnpj: text("cnpj"),
  address: text("address"),
  dpoName: text("dpo_name"),
  dpoContact: text("dpo_contact"),
  retentionYears: integer("retention_years").notNull().default(LGPD_MIN_RETENTION_YEARS),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Registro das 3 operações que a LGPD garante ao titular sobre dado
 * pessoal (Art. 18): exportar (portabilidade), anonimizar e excluir —
 * mantido para cumprir o dever de demonstrar conformidade (Art. 37,
 * "accountability"). NUNCA guarda o dado pessoal em si, só a referência
 * (tabela + id) e quem/quando executou a operação — por isso a linha
 * sobrevive mesmo depois que o dado referenciado foi anonimizado/
 * removido. Ver docs/lgpd-checklist.md.
 */
export const lgpdActionEnum = pgEnum("lgpd_action", ["export", "anonymize", "delete"]);

export const lgpdRequestLog = pgTable(
  "lgpd_request_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Quem executou a operação (auth.users, fora do schema do Drizzle —
    // mesmo padrão de memberships.userId/notifications.createdBy).
    performedBy: uuid("performed_by").notNull(),
    action: lgpdActionEnum("action").notNull(),
    subjectTable: text("subject_table").notNull(),
    subjectId: uuid("subject_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("lgpd_request_log_organization_id_idx").on(table.organizationId),
    index("lgpd_request_log_subject_idx").on(table.subjectTable, table.subjectId),
  ],
);
