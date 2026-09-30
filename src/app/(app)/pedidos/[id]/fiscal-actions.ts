"use server";

/**
 * Orquestração fina pedidos↔fiscal. `fiscal` não importa `pedidos`
 * (regra de acoplamento) — este arquivo vive fora dos dois módulos,
 * monta o payload de emissão a partir do barrel de `pedidos`
 * (`getPedidoById`/`listPedidoItens`) e chama o barrel de `fiscal`
 * (`emitirNotaFiscal`).
 */
import { getPedidoById, listPedidoItens } from "@/modules/pedidos";
import { getClienteById } from "@/modules/clientes";
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

  const cliente = await getClienteById(pedido.customerId);
  if (!cliente) {
    return { ok: false, message: "Cliente do pedido não encontrado." };
  }
  const end = cliente.endereco;

  const input: EmitirNotaFiscalInput = {
    pedidoId: pedido.id,
    pedidoNumber: pedido.number,
    cliente: {
      nome: cliente.name,
      documento: cliente.document ?? undefined,
      endereco: cliente.address ?? undefined,
      email: cliente.email ?? undefined,
      telefone: cliente.phone ? cliente.phone.replace(/\D/g, "") || undefined : undefined,
      consumidorFinal: cliente.type === "pf" || cliente.ieIndicator !== "contribuinte",
      tipo: cliente.type,
      razaoSocial: cliente.legalName ?? undefined,
      nomeFantasia: cliente.tradeName ?? undefined,
      indicadorIe: cliente.ieIndicator,
      ie: cliente.ie ?? undefined,
      im: cliente.im ?? undefined,
      enderecoEstruturado: end
        ? {
            cep: end.zip ?? undefined,
            logradouro: end.street ?? undefined,
            numero: end.number ?? undefined,
            complemento: end.complement ?? undefined,
            bairro: end.district ?? undefined,
            municipio: end.city ?? undefined,
            uf: end.state ?? undefined,
            codigoIbge: end.ibgeCode ?? undefined,
            codigoPais: end.countryCode,
          }
        : undefined,
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
