import { z } from "zod";
import { parseReaisInput } from "@/core/money";

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
  });
}
