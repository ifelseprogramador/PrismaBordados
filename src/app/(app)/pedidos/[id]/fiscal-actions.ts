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
import { getCatalogoBordadoItemById } from "@/modules/catalogo-bordado";
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

  const catalogoIds = [...new Set(itens.map((i) => i.catalogoItemId).filter(Boolean))] as string[];
  const catalogo = new Map(
    (await Promise.all(catalogoIds.map((id) => getCatalogoBordadoItemById(id)))).flatMap((c) =>
      c ? [[c.id, c] as const] : [],
    ),
  );

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
    itens: itens.map((item) => {
      const cat = item.catalogoItemId ? catalogo.get(item.catalogoItemId) : null;
      return {
        catalogoItemId: item.catalogoItemId,
        produto: item.produto,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        // Dados fiscais do item do catálogo (NCM/CFOP vazios caem no padrão do emitente).
        fiscal: cat
          ? {
              ncm: cat.ncm ?? undefined,
              cfop: cat.cfop ?? undefined,
              unidade: cat.unidade,
              origem: cat.origem,
              cst: cat.cst ?? undefined,
            }
          : undefined,
      };
    }),
  };

  return emitirNotaFiscal(input);
}
