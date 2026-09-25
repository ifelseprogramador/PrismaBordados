import { sumCents, type Cents } from "@/core/money";

export type LancamentoType = "entrada" | "saida";

export interface LancamentoLike {
  type: LancamentoType;
  amountCents: Cents;
}

/** Soma só os lançamentos de um tipo (entrada ou saída). */
export function sumByType(lancamentos: LancamentoLike[], type: LancamentoType): Cents {
  return sumCents(lancamentos.filter((l) => l.type === type).map((l) => l.amountCents));
}

/**
 * Lucro = entradas − saídas de um período. DIFERENTE de "saldo a
 * receber" (que é uma métrica do módulo `pedidos` — soma de
 * `saldoCents` de pedidos não terminais, ver
 * `modules/pedidos/queries.ts#getPedidosDashboardSummary`): lucro é
 * dinheiro que já entrou/saiu do caixa; a receber é dinheiro que ainda
 * vai entrar. A planilha antiga da empresa aparentemente confundia as
 * duas (ver docs/decisoes.md) — o dashboard mostra as duas lado a lado,
 * nunca somadas. Pode ser negativo (prejuízo do período) — nunca
 * clampado em zero, ao contrário de `pedidos/domain.ts#calculateSaldo`.
 */
export function calculateLucro(entradasCents: Cents, saidasCents: Cents): Cents {
  return entradasCents - saidasCents;
}

export interface PeriodSummary {
  entradasCents: Cents;
  saidasCents: Cents;
  lucroCents: Cents;
}

/** Agregação de um conjunto de lançamentos (ex.: os de um mês) —
 * usada tanto para compor `getFinanceiroDashboardSummary` quanto testada
 * isoladamente sem banco. */
export function calculatePeriodSummary(lancamentos: LancamentoLike[]): PeriodSummary {
  const entradasCents = sumByType(lancamentos, "entrada");
  const saidasCents = sumByType(lancamentos, "saida");
  return { entradasCents, saidasCents, lucroCents: calculateLucro(entradasCents, saidasCents) };
}
