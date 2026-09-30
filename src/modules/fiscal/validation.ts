import { z } from "zod";
import { isValidCnpj } from "@/core/document";
import {
  isValidCep,
  isValidCfop,
  isValidCnae,
  isValidCodigoServico,
  isValidIbge,
  isValidIe,
  isValidNcm,
  isValidUf,
  parsePercentToBps,
} from "@/core/fiscal-fields";

export const REGIMES_TRIBUTARIOS = {
  mei: "MEI",
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro presumido",
  lucro_real: "Lucro real",
} as const;

const text = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined);
const checked = (fn: (v: string) => boolean, msg: string) => text.refine((v) => !v || fn(v), msg);

/**
 * Contrato de entrada do form de configuração fiscal
 * (`components/fiscal-credentials-form.tsx` + `actions.ts#saveFiscalCredentials`).
 * `apiKey` chega em texto puro só até o limite da Server Action — nunca é
 * gravada assim (ver `crypto-placeholder.ts`). Dados do emitente são
 * opcionais aqui; a exigência é checada na emissão.
 */
export const fiscalCredentialsSchema = z.object({
  providerSlug: text,
  apiKey: text,
  cnpj: checked(isValidCnpj, "CNPJ inválido."),
  regimeTributario: text.refine(
    (v) => !v || v in REGIMES_TRIBUTARIOS,
    "Escolha um regime da lista.",
  ),
  serieNota: checked((v) => /^\d{1,3}$/.test(v), "Série deve ter até 3 dígitos."),
  razaoSocial: text,
  nomeFantasia: text,
  ie: checked(isValidIe, "Inscrição Estadual inválida."),
  im: text,
  zip: checked(isValidCep, "CEP deve ter 8 dígitos."),
  street: text,
  number: text,
  complement: text,
  district: text,
  city: text,
  state: checked(isValidUf, "UF inválida."),
  ibgeCode: checked(isValidIbge, "Código IBGE deve ter 7 dígitos."),
  defaultNcm: checked(isValidNcm, "NCM deve ter 8 dígitos."),
  defaultCfop: checked(isValidCfop, "CFOP deve ter 4 dígitos e começar com 5, 6 ou 7."),
  codigoServico: checked(isValidCodigoServico, "Use o formato da LC 116, ex.: 14.01."),
  cnae: checked(isValidCnae, "CNAE deve ter 7 dígitos."),
  issRate: text
    .refine((v) => !v || parsePercentToBps(v) !== null, "Informe um percentual entre 0 e 100.")
    .transform((v) => (v ? (parsePercentToBps(v) ?? undefined) : undefined)),
});

export type FiscalCredentialsInput = z.infer<typeof fiscalCredentialsSchema>;

export const FISCAL_FIELDS = Object.keys(fiscalCredentialsSchema.shape);

export function parseFiscalCredentialsFormData(formData: FormData) {
  return fiscalCredentialsSchema.safeParse(
    Object.fromEntries(FISCAL_FIELDS.map((f) => [f, formData.get(f) ?? undefined])),
  );
}
