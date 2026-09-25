import { z } from "zod";
import { isValidCnpj } from "@/core/document";
import { LGPD_MIN_RETENTION_YEARS } from "@/db/schema/privacy";

/**
 * Contrato de entrada único (form + Server Action) da tela de
 * configurações de LGPD — mesmo padrão de `modules/clientes/validation.ts`.
 * Todos os campos de identificação são opcionais no schema (uma
 * organização pode salvar aos poucos), mas `retentionYears` sempre tem
 * um valor (nunca vazio) e nunca pode ficar abaixo do prazo mínimo legal
 * de guarda de documento fiscal (CTN, 5 anos).
 */
export const privacySettingsSchema = z.object({
  legalName: z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? ""),
  cnpj: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || "")
    .refine((v) => !v || isValidCnpj(v), "CNPJ inválido."),
  address: z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? ""),
  dpoName: z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? ""),
  dpoContact: z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? ""),
  retentionYears: z.coerce
    .number()
    .int("Informe um número inteiro de anos.")
    .min(
      LGPD_MIN_RETENTION_YEARS,
      `O prazo mínimo de guarda de documento fiscal no Brasil é ${LGPD_MIN_RETENTION_YEARS} anos (CTN, Art. 173/174) — não é possível configurar um prazo menor.`,
    ),
});

export type PrivacySettingsInput = z.infer<typeof privacySettingsSchema>;

export function parsePrivacySettingsFormData(formData: FormData) {
  return privacySettingsSchema.safeParse({
    legalName: formData.get("legalName"),
    cnpj: formData.get("cnpj"),
    address: formData.get("address"),
    dpoName: formData.get("dpoName"),
    dpoContact: formData.get("dpoContact"),
    retentionYears: formData.get("retentionYears"),
  });
}
