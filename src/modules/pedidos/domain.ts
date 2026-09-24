import { multiplyCents, sumCents, type Cents } from "@/core/money";

export type PedidoStatus =
  "orcamento" | "aprovado" | "em_producao" | "pronto" | "entregue" | "cancelado";

/**
 * Transições válidas de status do pedido. Testado sem banco (funções
 * puras) — é a máquina de estados que `actions.ts#transitionPedidoStatus`
 * consulta antes de qualquer `UPDATE`, pra nunca deixar o banco num
 * estado que a UI não sabe representar (ex.: pular de "orcamento" direto
 * pra "pronto"). `cancelado` é alcançável de qualquer estado
 * não-terminal; `entregue` e `cancelado` são terminais.
 */
const VALID_TRANSITIONS: Record<PedidoStatus, PedidoStatus[]> = {
  orcamento: ["aprovado", "cancelado"],
  aprovado: ["em_producao", "cancelado"],
  em_producao: ["pronto", "cancelado"],
  pronto: ["entregue", "cancelado"],
  entregue: [],
  cancelado: [],
};

export function isValidTransition(from: PedidoStatus, to: PedidoStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function isTerminalStatus(status: PedidoStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}

export interface PedidoItemLike {
  quantity: number;
  unitPriceCents: Cents;
}

/** Total de uma linha de item — mesma fórmula da coluna gerada no banco
 * (`round(quantity * unit_price_cents)`), aqui pra validar no cliente
 * antes de enviar e pra testar a regra isoladamente. */
export function calculateItemTotal(item: PedidoItemLike): Cents {
  return multiplyCents(item.unitPriceCents, item.quantity);
}

/** Total do pedido: soma dos itens (sem desconto no MVP — o pedido físico
 * de referência não tem campo de desconto, diferente da OS do mecano-erp). */
export function calculateOrderTotal(items: PedidoItemLike[]): Cents {
  return sumCents(items.map(calculateItemTotal));
}

/**
 * Saldo a receber = total - adiantamento. Nunca fica negativo na
 * exibição, mesmo que um adiantamento tenha sido lançado maior que o
 * total (erro de digitação, troco antecipado etc.) — a coluna gerada no
 * banco (`saldo_cents`) faz a subtração crua; esta função é a mesma
 * regra do lado da aplicação, usada para validar/exibir antes de gravar.
 */
export function calculateSaldo(totalCents: Cents, adiantamentoCents: Cents): Cents {
  return Math.max(0, totalCents - adiantamentoCents);
}

/** Verdadeiro quando o adiantamento lançado excede o total do pedido —
 * caso de borda que a UI deve avisar (não é um erro que bloqueia o
 * registro, só um alerta: aconteceu, ex., de o cliente pagar adiantado
 * mais do que o pedido fechou). */
export function isAdiantamentoAboveTotal(totalCents: Cents, adiantamentoCents: Cents): boolean {
  return adiantamentoCents > totalCents;
}
