"use server";

/**
 * Orquestração fina pedidos↔fiscal. `fiscal` não importa `pedidos`
 * (regra de acoplamento) — este arquivo vive fora dos dois módulos,
 * monta o payload de emissão a partir do barrel de `pedidos`
 * (`getPedidoById`/`listPedidoItens`) e chama o barrel de `fiscal`
 * (`emitirNotaFiscal`).
 */
import { getPedidoById, listPedidoItens } from "@/modules/pedidos";
import { emitirNotaFiscal, type EmitirNotaFiscalInput } from "@/modules/fiscal";
import type { ActionResult } from "@/core/action-result";

export async function emitirNotaFiscalDoPedido(pedidoId: string): Promise<ActionResult> {
  const pedido = await getPedidoById(pedidoId);
  if (!pedido) {
    return { ok: false, message: "Pedido não encontrado." };
  }

  const itens = await listPedidoItens(pedidoId);
  if (itens.length === 0) {
    return { ok: false, message: "Pedido sem itens para emitir nota fiscal." };
  }

  const input: EmitirNotaFiscalInput = {
    pedidoId: pedido.id,
    pedidoNumber: pedido.number,
    cliente: {
      nome: pedido.customerName,
      documento: pedido.customerDocument ?? undefined,
      endereco: pedido.customerAddress ?? undefined,
    },
    itens: itens.map((item) => ({
      catalogoItemId: item.catalogoItemId,
      produto: item.produto,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    })),
  };

  return emitirNotaFiscal(input);
}
