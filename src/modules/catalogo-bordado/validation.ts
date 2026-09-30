import { z } from "zod";
import { parseReaisInput } from "@/core/money";
import { isValidCfop, isValidCst, isValidNcm, isValidOrigem } from "@/core/fiscal-fields";

const fiscalText = (fn: (v: string) => boolean, msg: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .refine((v) => !v || fn(v), msg);

function splitList(value: FormDataEntryValue | null): string[] {
  const text = String(value ?? "").trim();
  if (!text) return [];
  return text
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export const catalogoBordadoItemSchema = z.object({
  tipoProduto: z.string().trim().min(1, "Informe o tipo de produto."),
  modeloPadrao: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  tamanhosAceitos: z.array(z.string().trim().min(1)).default([]),
  coresAceitas: z.array(z.string().trim().min(1)).default([]),
  defaultPriceCents: z.coerce.number().int().min(0).default(0),
  ncm: fiscalText(isValidNcm, "NCM deve ter 8 dígitos."),
  cfop: fiscalText(isValidCfop, "CFOP deve ter 4 dígitos e começar com 5, 6 ou 7."),
  unidade: z.string().trim().min(1, "Informe a unidade.").max(6).default("UN"),
  origem: z.string().trim().default("0").refine(isValidOrigem, "Origem deve ser de 0 a 8."),
  cst: fiscalText(isValidCst, "CST/CSOSN deve ter 2 ou 3 dígitos."),
});

export type CatalogoBordadoItemInput = z.infer<typeof catalogoBordadoItemSchema>;

export function parseCatalogoBordadoItemFormData(formData: FormData) {
  const defaultPriceCents = parseReaisInput(String(formData.get("defaultPrice") ?? "0")) ?? 0;
  return catalogoBordadoItemSchema.safeParse({
    tipoProduto: formData.get("tipoProduto"),
    modeloPadrao: formData.get("modeloPadrao") ?? undefined,
    tamanhosAceitos: splitList(formData.get("tamanhosAceitos")),
    coresAceitas: splitList(formData.get("coresAceitas")),
    defaultPriceCents,
    ncm: formData.get("ncm") ?? undefined,
    cfop: formData.get("cfop") ?? undefined,
    unidade: formData.get("unidade") || undefined,
    origem: formData.get("origem") || undefined,
    cst: formData.get("cst") ?? undefined,
  });
}
