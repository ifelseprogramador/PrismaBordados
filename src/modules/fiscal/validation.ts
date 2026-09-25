import { z } from "zod";

/**
 * Contrato de entrada do form de credenciais fiscais
 * (`components/fiscal-credentials-form.tsx` + `actions.ts#saveFiscalCredentials`).
 * `apiKey` chega em texto puro só até o limite da Server Action — nunca é
 * gravada assim (ver `crypto-placeholder.ts`). `providerSlug` aceita
 * vazio (organização ainda não escolheu provedor).
 */
export const fiscalCredentialsSchema = z.object({
  providerSlug: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  apiKey: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  cnpj: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  regimeTributario: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  serieNota: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
});

export type FiscalCredentialsInput = z.infer<typeof fiscalCredentialsSchema>;

export function parseFiscalCredentialsFormData(formData: FormData) {
  return fiscalCredentialsSchema.safeParse({
    providerSlug: formData.get("providerSlug"),
    apiKey: formData.get("apiKey"),
    cnpj: formData.get("cnpj"),
    regimeTributario: formData.get("regimeTributario"),
    serieNota: formData.get("serieNota"),
  });
}
