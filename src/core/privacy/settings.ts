import "server-only";
import { eq } from "drizzle-orm";
import type { Database } from "@/core/db";
import { organizationPrivacySettings, LGPD_MIN_RETENTION_YEARS } from "@/db/schema/privacy";
import type { PrivacySettings } from "./types";

export type { PrivacySettings };
export { LGPD_MIN_RETENTION_YEARS };

const EMPTY_SETTINGS: PrivacySettings = {
  legalName: "",
  cnpj: "",
  address: "",
  dpoName: "",
  dpoContact: "",
  retentionYears: LGPD_MIN_RETENTION_YEARS,
};

/** "Sem linha" = nada preenchido ainda — nunca devolve `null`/`undefined`
 * solto pela UI, sempre um objeto com string vazia em cada campo e o
 * prazo mínimo legal como padrão de `retentionYears`. */
export async function getPrivacySettings(
  db: Database,
  organizationId: string,
): Promise<PrivacySettings> {
  const [row] = await db
    .select()
    .from(organizationPrivacySettings)
    .where(eq(organizationPrivacySettings.organizationId, organizationId))
    .limit(1);

  if (!row) return EMPTY_SETTINGS;

  return {
    legalName: row.legalName ?? "",
    cnpj: row.cnpj ?? "",
    address: row.address ?? "",
    dpoName: row.dpoName ?? "",
    dpoContact: row.dpoContact ?? "",
    retentionYears: row.retentionYears,
  };
}

/** `retentionYears` é validado ANTES de chegar aqui (`validation.ts`,
 * mínimo `LGPD_MIN_RETENTION_YEARS`) — esta função só grava. */
export async function setPrivacySettings(
  db: Database,
  organizationId: string,
  settings: PrivacySettings,
) {
  await db
    .insert(organizationPrivacySettings)
    .values({ organizationId, ...settings })
    .onConflictDoUpdate({
      target: organizationPrivacySettings.organizationId,
      set: { ...settings, updatedAt: new Date() },
    });
}
