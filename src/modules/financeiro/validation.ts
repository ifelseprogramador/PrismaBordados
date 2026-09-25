import { z } from "zod";
import { parseReaisInput } from "@/core/money";

export const LANCAMENTO_TYPES = ["entrada", "saida"] as const;
export const LANCAMENTO_CATEGORIAS = [
  "venda",
  "adiantamento",
  "saldo_recebido",
  "compra_material",
  "despesa_fixa",
  "outro",
] as const;

export const LANCAMENTO_CATEGORIA_LABELS: Record<(typeof LANCAMENTO_CATEGORIAS)[number], string> = {
  venda: "Venda",
  adiantamento: "Adiantamento",
  saldo_recebido: "Saldo recebido",
  compra_material: "Compra de material",
  despesa_fixa: "Despesa fixa",
  outro: "Outro",
};

/** Contrato de entrada único (form manual em `/financeiro` + Server
 * Action) — lançamentos automáticos (ver `actions.ts#createLancamentoRecord`)
 * usam o mesmo schema, com `referenceType`/`referenceId` preenchidos à
 * parte pela orquestração, não pelo usuário. */
export const lancamentoSchema = z.object({
  type: z.enum(LANCAMENTO_TYPES),
  categoria: z.enum(LANCAMENTO_CATEGORIAS),
  amountCents: z.coerce.number().int().positive("O valor precisa ser maior que zero."),
  date: z.string().trim().min(1, "Informe a data."),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
});

export type LancamentoInput = z.infer<typeof lancamentoSchema>;

export function parseLancamentoFormData(formData: FormData) {
  const amountCents = parseReaisInput(String(formData.get("amount") ?? ""));
  return lancamentoSchema.safeParse({
    type: formData.get("type"),
    categoria: formData.get("categoria"),
    amountCents: amountCents ?? undefined,
    date: formData.get("date"),
    description: formData.get("description") ?? undefined,
  });
}
