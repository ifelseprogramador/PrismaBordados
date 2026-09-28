"use server";

import { revalidatePath } from "next/cache";
import { deletePedido, listPedidosByClienteId } from "@/modules/pedidos";
import { deleteFiscalNotasForPedido } from "@/modules/fiscal";
import { getClienteById, deleteCliente } from "@/modules/clientes";
import type { ActionResult } from "@/core/action-result";

/**
 * Orquestração fina pedidos↔fiscal↔clientes — nenhum dos três módulos
 * importa os outros (regra de acoplamento, `src/modules/README.md`).
 * Apaga um pedido inteiro:
 *   1. Notas fiscais do pedido primeiro (`fiscal_notas.pedidoId` é
 *      `onDelete: "restrict"` — bloquearia o passo 2 se sobrasse
 *      alguma). A tela de detalhe já avisa ANTES de chamar isto se
 *      alguma nota já foi emitida de verdade — aqui só executa.
 *   2. O pedido e os itens dele (cascade).
 *   3. Se o cliente do pedido já era "removido" (LGPD, `anonymizedAt`
 *      preenchido) e não sobrou mais NENHUM outro pedido dele, apaga a
 *      linha do cliente também — ela só existia pra manter a FK de
 *      `pedidos.customerId` (`onDelete: "restrict"`), sem motivo pra
 *      continuar depois que o último pedido some.
 */
export async function deletePedidoCompleto(pedidoId: string): Promise<ActionResult> {
  await deleteFiscalNotasForPedido(pedidoId);

  const result = await deletePedido(pedidoId);
  if (!result.ok || !result.customerId) {
    return result;
  }

  const cliente = await getClienteById(result.customerId);
  if (cliente?.anonymizedAt) {
    const pedidosRestantes = await listPedidosByClienteId(result.customerId);
    if (pedidosRestantes.length === 0) {
      await deleteCliente(result.customerId);
    }
  }

  revalidatePath("/pedidos");
  return { ok: true };
}
