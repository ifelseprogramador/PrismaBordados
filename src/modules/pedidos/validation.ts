import { z } from "zod";
import { parseReaisInput } from "@/core/money";

export const pedidoHeaderSchema = z.object({
  customerId: z.uuid("Selecione um cliente."),
  orderDate: z.string().trim().min(1, "Informe a data do pedido."),
  deliveryDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  deliveryTime: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
});

export type PedidoHeaderInput = z.infer<typeof pedidoHeaderSchema>;

function emptyToUndefined(value: FormDataEntryValue | null) {
  return value === "" || value === null ? undefined : value;
}

export function parsePedidoHeaderFormData(formData: FormData) {
  return pedidoHeaderSchema.safeParse({
    customerId: formData.get("customerId"),
    orderDate: formData.get("orderDate"),
    deliveryDate: emptyToUndefined(formData.get("deliveryDate")),
    deliveryTime: emptyToUndefined(formData.get("deliveryTime")),
  });
}

/**
 * Só para a CRIAÇÃO do pedido (`createPedido`) — schema separado de
 * `pedidoHeaderSchema` de propósito: `updatePedidoHeader` (edição do
 * cabeçalho depois de criado) nunca deve poder tocar em
 * `adiantamentoCents`, que a partir daí só é alterado via
 * `AdiantamentoForm`/`registerAdiantamento`. Os dois campos aqui são
 * opcionais — nem todo pedido nasce com entrada já paga ou vencimento
 * combinado.
 */
export const pedidoCreateSchema = pedidoHeaderSchema.extend({
  adiantamentoCents: z.coerce
    .number()
    .int()
    .min(0, "O adiantamento não pode ser negativo.")
    .optional(),
  paymentDueDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
});

export type PedidoCreateInput = z.infer<typeof pedidoCreateSchema>;

export function parsePedidoCreateFormData(formData: FormData) {
  const adiantamentoCents = parseReaisInput(String(formData.get("adiantamento") ?? ""));
  return pedidoCreateSchema.safeParse({
    customerId: formData.get("customerId"),
    orderDate: formData.get("orderDate"),
    deliveryDate: emptyToUndefined(formData.get("deliveryDate")),
    deliveryTime: emptyToUndefined(formData.get("deliveryTime")),
    adiantamentoCents: adiantamentoCents ?? undefined,
    paymentDueDate: emptyToUndefined(formData.get("paymentDueDate")),
  });
}

export const pedidoItemSchema = z.object({
  catalogoItemId: z
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  produto: z.string().trim().min(1, "Informe o produto."),
  modelo: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  tamanho: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  cor: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  quantity: z.coerce.number().positive("A quantidade precisa ser maior que zero."),
  unitPriceCents: z.coerce.number().int().min(0),
});

export type PedidoItemInput = z.infer<typeof pedidoItemSchema>;

/**
 * Itens enviados de uma vez pelo assistente do modo Fácil (campo `itemsJson`,
 * ver `components/facil/facil-search.tsx#serializeLines`). Cada item passa
 * pela MESMA regra do item avulso (`pedidoItemSchema`); `ref` é o id do item
 * de catálogo (vazio no produto avulso, que gera NFS-e e não NF-e).
 */
export function parsePedidoItemsPayload(raw: FormDataEntryValue | null) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return { success: true as const, data: [] as PedidoItemInput[] };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { success: false as const, error: "Não consegui ler os itens. Tente de novo." };
  }
  if (!Array.isArray(json) || json.length > 100) {
    return { success: false as const, error: "Itens inválidos (máximo de 100 por pedido)." };
  }
  const items: PedidoItemInput[] = [];
  for (const entry of json) {
    const row = (entry ?? {}) as Record<string, unknown>;
    const parsed = pedidoItemSchema.safeParse({
      catalogoItemId: row.ref ?? "",
      produto: row.label,
      modelo: row.modelo,
      tamanho: row.tamanho,
      cor: row.cor,
      quantity: row.quantity,
      unitPriceCents: row.unitPriceCents,
    });
    if (!parsed.success) {
      const name = typeof row.label === "string" && row.label ? `“${row.label}”` : "um item";
      return {
        success: false as const,
        error: `Confira ${name}: ${parsed.error.issues[0]?.message ?? "dados inválidos"}`,
      };
    }
    items.push(parsed.data);
  }
  return { success: true as const, data: items };
}

export function parsePedidoItemFormData(formData: FormData) {
  const unitPriceCents = parseReaisInput(String(formData.get("unitPrice") ?? ""));
  return pedidoItemSchema.safeParse({
    catalogoItemId: formData.get("catalogoItemId") ?? "",
    produto: formData.get("produto"),
    modelo: formData.get("modelo") ?? undefined,
    tamanho: formData.get("tamanho") ?? undefined,
    cor: formData.get("cor") ?? undefined,
    quantity: formData.get("quantity"),
    unitPriceCents: unitPriceCents ?? undefined,
  });
}

/** Registro de adiantamento — campo AGREGADO (soma dos recebimentos), não
 * um lançamento individual (isso é trabalho do futuro módulo
 * `financeiro`). Aqui só valida o novo total agregado informado.
 * `paymentDueDate` é opcional — até quando o SALDO restante precisa ser
 * pago (ver `schema.ts#paymentDueDate`); vazio limpa o vencimento. */
export const adiantamentoSchema = z.object({
  adiantamentoCents: z.coerce.number().int().min(0, "O adiantamento não pode ser negativo."),
  paymentDueDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
});

export function parseAdiantamentoFormData(formData: FormData) {
  const adiantamentoCents = parseReaisInput(String(formData.get("adiantamento") ?? "0"));
  return adiantamentoSchema.safeParse({
    adiantamentoCents: adiantamentoCents ?? undefined,
    paymentDueDate: emptyToUndefined(formData.get("paymentDueDate")),
  });
}
