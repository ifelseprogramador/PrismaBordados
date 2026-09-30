import type { Cents } from "@/core/money";
import type { FiscalClientePayload, FiscalItemPayload, FiscalOperacaoTipo } from "./provider";

export interface PedidoItemLike {
  catalogoItemId?: string | null;
  produto: string;
  quantity: number | string;
  unitPriceCents: Cents;
}

/**
 * Decide NF-e (peça pronta vendida) vs. NFS-e (serviço de bordado sobre
 * peça trazida pelo cliente) por ITEM do pedido.
 *
 * Decisão (ver docs/decisoes.md, "campo que decide NF-e vs. NFS-e por
 * item"): em vez de adicionar uma coluna nova em `pedido_itens` (o que
 * exigiria `fiscal` conhecer o schema de `pedidos` além da FK de
 * `fiscal_notas`, ou `pedidos` conhecer conceitos fiscais), reaproveita
 * um sinal que já existe: `catalogoItemId`. Um item vinculado a um item
 * de catálogo (`catalogoItemId` preenchido) é uma peça PRONTA que a
 * empresa vende — operação de venda, NF-e. Um item sem vínculo (produto
 * digitado à mão, o cliente trouxe a peça própria para bordar) é
 * SERVIÇO sobre bem de terceiro — NFS-e. Isso já é exatamente a
 * semântica de `catalogoItemId` documentada em
 * `modules/pedidos/schema.ts#pedidoItens` — nenhuma migration nova foi
 * necessária.
 */
export function decideOperacaoTipo(
  item: Pick<PedidoItemLike, "catalogoItemId">,
): FiscalOperacaoTipo {
  return item.catalogoItemId ? "venda" : "servico";
}

export function buildFiscalItemPayload(item: PedidoItemLike): FiscalItemPayload {
  return {
    descricao: item.produto,
    quantidade: Number(item.quantity),
    valorUnitarioCents: item.unitPriceCents,
    tipoOperacao: decideOperacaoTipo(item),
  };
}

export interface SplitItens<T> {
  venda: T[];
  servico: T[];
}

/** Separa os itens de um pedido em dois grupos — um pedido com itens dos
 * dois tipos gera NF-e E NFS-e juntas (ver `schema.ts#fiscalNotas`). */
export function splitItensPorOperacao<T extends Pick<PedidoItemLike, "catalogoItemId">>(
  itens: T[],
): SplitItens<T> {
  const venda: T[] = [];
  const servico: T[] = [];
  for (const item of itens) {
    (decideOperacaoTipo(item) === "venda" ? venda : servico).push(item);
  }
  return { venda, servico };
}

export function calculateItensTotal(itens: PedidoItemLike[]): Cents {
  return itens.reduce(
    (total, item) => total + Math.round(item.unitPriceCents * Number(item.quantity)),
    0,
  );
}

/**
 * Dados do cliente (tomador/destinatário) que o tipo de nota exige.
 * Devolve a lista de pendências em português (vazia = pode emitir).
 * NF-e: documento, endereço completo com IBGE, IE se contribuinte e razão
 * social para PJ. NFS-e: município (UF + IBGE) e CEP do tomador.
 */
export function validarClienteParaNota(
  cliente: FiscalClientePayload,
  itens: Pick<PedidoItemLike, "catalogoItemId">[],
): string[] {
  const tipos = new Set(itens.map(decideOperacaoTipo));
  const e = cliente.enderecoEstruturado ?? {};
  const faltando: string[] = [];

  if (tipos.has("venda")) {
    if (!cliente.documento) faltando.push("CPF/CNPJ (NF-e)");
    if (cliente.tipo === "pj" && !cliente.razaoSocial) faltando.push("razão social (NF-e)");
    if (cliente.indicadorIe === "contribuinte" && !cliente.ie) faltando.push("Inscrição Estadual");
    const campos: [keyof typeof e, string][] = [
      ["cep", "CEP"],
      ["logradouro", "logradouro"],
      ["numero", "número"],
      ["bairro", "bairro"],
      ["municipio", "cidade"],
      ["uf", "UF"],
      ["codigoIbge", "código IBGE"],
    ];
    for (const [k, label] of campos) if (!e[k]) faltando.push(`${label} (NF-e)`);
  } else if (tipos.has("servico")) {
    for (const [k, label] of [
      ["cep", "CEP"],
      ["uf", "UF"],
      ["codigoIbge", "código IBGE"],
    ] as const) {
      if (!e[k]) faltando.push(`${label} (NFS-e)`);
    }
  }
  // Pedido misto (NF-e + NFS-e): as regras de NF-e já cobrem as de NFS-e.
  return faltando;
}
