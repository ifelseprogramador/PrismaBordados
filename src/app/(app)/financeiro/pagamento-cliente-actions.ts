"use server";

/**
 * Orquestração fina pedidos↔financeiro para o caso "recebi um pagamento
 * de um cliente que já tem saldo em aberto" iniciado a partir de
 * `/financeiro` (não da ficha do pedido — ver
 * `app/(app)/pedidos/[id]/financeiro-actions.ts` para o caso simétrico
 * iniciado de lá). Mesma regra de sempre: fora dos dois módulos, nenhum
 * importa o outro.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { parseReaisInput } from "@/core/money";
import type { ActionResult } from "@/core/action-result";
import { getPedidoById, incrementarAdiantamento } from "@/modules/pedidos";
import { createLancamentoRecord } from "@/modules/financeiro";

const pagamentoClienteSchema = z.object({
  pedidoId: z.uuid("Selecione o pedido que está sendo pago."),
  valorCents: z.coerce.number().int().positive("Informe um valor maior que zero."),
  date: z.string().trim().min(1, "Informe a data."),
});

/**
 * Recebe `pedidoId` (não `clienteId`) porque um cliente pode ter mais de
 * um pedido em aberto — o form (`pagamento-cliente-form.tsx`) escolhe o
 * cliente só para filtrar a lista de pedidos, mas quem de fato importa
 * aqui é qual PEDIDO está sendo pago. `valorCents` é o quanto está sendo
 * pago AGORA (delta), não o novo total agregado.
 */
export async function registrarPagamentoCliente(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const valorCents = parseReaisInput(String(formData.get("valor") ?? ""));
  const parsed = pagamentoClienteSchema.safeParse({
    pedidoId: formData.get("pedidoId"),
    valorCents: valorCents ?? undefined,
    date: formData.get("date"),
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const pedidoAntes = await getPedidoById(parsed.data.pedidoId);
  if (!pedidoAntes) {
    return { ok: false, message: "Pedido não encontrado." };
  }

  const result = await incrementarAdiantamento(parsed.data.pedidoId, parsed.data.valorCents);
  if (!result.ok) {
    return result;
  }

  const categoria = (result.saldoCents ?? 0) <= 0 ? "saldo_recebido" : "adiantamento";
  await createLancamentoRecord({
    type: "entrada",
    categoria,
    amountCents: parsed.data.valorCents,
    date: parsed.data.date,
    description: `Pagamento recebido do pedido #${pedidoAntes.number} — ${pedidoAntes.customerName}`,
    referenceType: "pedido",
    referenceId: parsed.data.pedidoId,
  });

  revalidatePath("/financeiro");
  revalidatePath("/");
  revalidatePath(`/pedidos/${parsed.data.pedidoId}`);
  return { ok: true };
}
