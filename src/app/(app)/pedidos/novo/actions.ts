"use server";

/**
 * Orquestração fina pedidos↔financeiro na CRIAÇÃO do pedido — mesmo
 * padrão de `app/(app)/pedidos/[id]/financeiro-actions.ts`, mas para o
 * caso "o cliente já deu entrada ao fechar o pedido" em vez de "recebeu
 * um pagamento depois". Fora dos dois módulos de propósito (nenhum
 * importa o outro).
 */
import { revalidatePath } from "next/cache";
import {
  createPedido,
  createPedidoWithItems,
  getPedidoById,
  type InsertResult,
} from "@/modules/pedidos";
import { createLancamentoRecord } from "@/modules/financeiro";

/**
 * Cria o pedido (`pedidos#createPedido`) e, se ele nasceu com adiantamento
 * (campo opcional do form — ver `pedido-form.tsx`), cria também o
 * lançamento de `entrada` correspondente em `financeiro`, no valor cheio
 * do adiantamento inicial (não há "antes" pra tirar diferença, é a
 * primeira vez que esse pedido recebe algo).
 */
export async function criarPedidoComAdiantamento(
  prevState: InsertResult,
  formData: FormData,
): Promise<InsertResult> {
  return lancarAdiantamento(await createPedido(prevState, formData));
}

/**
 * Mesmo que `criarPedidoComAdiantamento`, mas para o assistente do modo Fácil:
 * o pedido já nasce com os itens (`createPedidoWithItems`), e só depois o
 * adiantamento vira lançamento — com o total real, a categoria
 * (adiantamento × saldo recebido) sai certa.
 */
export async function criarPedidoComItens(
  prevState: InsertResult,
  formData: FormData,
): Promise<InsertResult> {
  return lancarAdiantamento(await createPedidoWithItems(prevState, formData));
}

async function lancarAdiantamento(result: InsertResult): Promise<InsertResult> {
  if (!result.ok || !result.id) {
    return result;
  }

  const pedido = await getPedidoById(result.id);
  if (pedido && pedido.adiantamentoCents > 0) {
    const categoria = (pedido.saldoCents ?? 0) <= 0 ? "saldo_recebido" : "adiantamento";
    await createLancamentoRecord({
      type: "entrada",
      categoria,
      amountCents: pedido.adiantamentoCents,
      date: pedido.orderDate,
      description: `Adiantamento inicial do pedido #${pedido.number} — ${pedido.customerName}`,
      referenceType: "pedido",
      referenceId: pedido.id,
    });
    revalidatePath("/financeiro");
    revalidatePath("/");
  }

  return result;
}
