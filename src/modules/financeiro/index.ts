/**
 * API pública do módulo `financeiro`. A orquestração fina em
 * `app/(app)/pedidos/[id]/financeiro-actions.ts` importa
 * `createLancamentoRecord` daqui — nunca de `actions.ts` direto.
 */
export type { FinanceiroLancamento } from "./schema.types";
export {
  lancamentoSchema,
  type LancamentoInput,
  LANCAMENTO_TYPES,
  LANCAMENTO_CATEGORIAS,
  LANCAMENTO_CATEGORIA_LABELS,
} from "./validation";
export {
  sumByType,
  calculateLucro,
  calculatePeriodSummary,
  type LancamentoLike,
  type PeriodSummary,
} from "./domain";
export {
  listLancamentos,
  getFinanceiroDashboardSummary,
  getEntradasSaidasPorMes,
  type ListLancamentosOptions,
  type MesEntradasSaidas,
} from "./queries";
export {
  createLancamento,
  createLancamentoRecord,
  deleteLancamento,
  type LancamentoRecordInput,
} from "./actions";
export { LancamentoForm } from "./components/lancamento-form";
export { LancamentosTable } from "./components/lancamentos-table";
export { EntradasSaidasChart } from "./components/entradas-saidas-chart";
