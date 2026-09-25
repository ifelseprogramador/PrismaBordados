import { LGPD_MIN_RETENTION_YEARS } from "@/db/schema/privacy";

export { LGPD_MIN_RETENTION_YEARS };

/**
 * Tipo puro, sem `"server-only"` — importável por Client Components
 * (`components/privacy-settings-form.tsx`) e por `settings.ts` (que É
 * server-only). Nunca importe `settings.ts` de um Client Component: um
 * arquivo `"server-only"` importado (mesmo só por um `type`) quebra o
 * bundle do cliente — mesma causa raiz do bug de `"use server"` corrigido
 * antes nesta sessão em `modules/clientes/actions.ts`.
 */
export interface PrivacySettings {
  legalName: string;
  cnpj: string;
  address: string;
  dpoName: string;
  dpoContact: string;
  retentionYears: number;
}
