"use server";

/**
 * Orquestração fina pedidos↔financeiro (ver docs/decisoes.md,
 * "orquestração pedidos↔financeiro: onde ficou"). Nenhum dos dois
 * módulos pode importar o outro (regra de acoplamento em
 * `src/modules/README.md`) — este arquivo vive FORA de ambos, em
 * `app/(app)/pedidos/[id]/`, e é o único lugar que conhece os dois
 * barrels ao mesmo tempo: chama `pedidos` para registrar o recebimento
 * (valor agregado) e `financeiro` para criar o lançamento de `entrada`
 * correspondente (valor do recebimento em si, não o agregado).
 */
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/core/action-result";
import { getPedidoById, registerAdiantamento } from "@/modules/pedidos";
import { createLancamentoRecord } from "@/modules/financeiro";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Registra um recebimento (adiantamento ou saldo) de um pedido: chama
 * `pedidos#registerAdiantamento` (grava o novo TOTAL agregado recebido)
 * e, se o total agregado realmente cresceu, cria um lançamento de
 * `entrada` em `financeiro` no valor exato da DIFERENÇA (o recebimento
 * desta vez, não o agregado) — categoria `saldo_recebido` quando este
 * recebimento zera o saldo do pedido, `adiantamento` caso contrário.
 */
export async function registrarRecebimentoPedido(
  pedidoId: string,
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const pedidoAntes = await getPedidoById(pedidoId);
  if (!pedidoAntes) {
    return { ok: false, message: "Pedido não encontrado." };
  }

  const result = await registerAdiantamento(pedidoId, prevState, formData);
  if (!result.ok) {
    return result;
  }

  const pedidoDepois = await getPedidoById(pedidoId);
  if (!pedidoDepois) {
    return result;
  }

  const recebidoAgoraCents = pedidoDepois.adiantamentoCents - pedidoAntes.adiantamentoCents;
  if (recebidoAgoraCents > 0) {
    const categoria = (pedidoDepois.saldoCents ?? 0) <= 0 ? "saldo_recebido" : "adiantamento";
    await createLancamentoRecord({
      type: "entrada",
      categoria,
      amountCents: recebidoAgoraCents,
      date: todayDateString(),
      description: `Recebimento do pedido #${pedidoDepois.number} — ${pedidoDepois.customerName}`,
      referenceType: "pedido",
      referenceId: pedidoId,
    });
  }

  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/financeiro");
  revalidatePath("/");
  return result;
}
