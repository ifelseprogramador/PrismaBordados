/**
 * API pública do módulo `pedidos`. Um futuro módulo `financeiro` deve
 * importar `Pedido`/`getPedidosDashboardSummary`/`registerAdiantamento`
 * daqui, nunca de `schema.ts`/`queries.ts` diretamente.
 */
export type { Pedido, PedidoItem } from "./schema.types";
export type { PedidoStatus } from "./domain";
export type { PedidoStatusFilter, PedidoSort } from "./queries";
export type { ClienteComSaldoAReceber, PrevisaoRecebimentos } from "./queries";
export {
  isValidTransition,
  isTerminalStatus,
  isReceivableStatus,
  isDebtStatus,
  isOverdue,
  calculateOrderTotal,
  calculateSaldo,
  isAdiantamentoAboveTotal,
} from "./domain";
export {
  getPedidosDashboardSummary,
  listPedidos,
  listPedidosByClienteId,
  listClientesComSaldoAReceber,
  getPrevisaoRecebimentos,
  getPedidoById,
  listPedidoItens,
  PEDIDO_SORT_OPTIONS,
} from "./queries";
export {
  createPedido,
  createPedidoRecord,
  updatePedidoHeader,
  addPedidoItem,
  removePedidoItem,
  registerAdiantamento,
  incrementarAdiantamento,
  transitionPedidoStatus,
  type InsertResult,
  type IncrementarAdiantamentoResult,
} from "./actions";
export { PEDIDO_STATUS_LABELS, PedidoStatusBadge } from "./components/pedido-status-badge";
