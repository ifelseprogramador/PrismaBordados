import type { FilterField } from "@/components/list-filter-bar";
import { PERIOD_FILTER, pickOption, sinceFromParam } from "@/core/list-filters";
import {
  PEDIDO_SORT_OPTIONS,
  PEDIDOS_ABERTOS_STATUSES,
  type PedidoSort,
  type PedidoStatusFilter,
} from "./queries";
import { PEDIDO_STATUS_LABELS } from "./components/pedido-status-badge";

/** Valor especial de `status` na URL (não é do enum): o conjunto "em aberto" que o painel soma. */
export const PEDIDO_ABERTO = "aberto";

/** Filtros e ordenação da lista de pedidos — UMA definição para os dois layouts. */
export const PEDIDO_FILTERS: FilterField[] = [
  {
    param: "status",
    allLabel: "Todos os status",
    options: [
      { value: PEDIDO_ABERTO, label: "Em aberto" },
      ...Object.entries(PEDIDO_STATUS_LABELS).map(([value, label]) => ({ value, label })),
    ],
  },
  {
    param: "pagamento",
    allLabel: "Qualquer pagamento",
    options: [
      { value: "aberto", label: "Com saldo a receber" },
      { value: "atrasado", label: "Pagamento atrasado" },
      { value: "quitado", label: "Quitados" },
    ],
  },
  { ...PERIOD_FILTER, allLabel: "Qualquer data de criação" },
];
export const PEDIDO_SORT_CHOICES = Object.entries(PEDIDO_SORT_OPTIONS).map(([value, label]) => ({
  value,
  label,
}));
export const PEDIDO_DEFAULT_SORT: PedidoSort = "number_desc";

export function parsePedidoListParams(sp: Record<string, string | string[] | undefined>) {
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const previsaoAtiva = sp.previsao === "30dias";
  return {
    search: typeof sp.q === "string" ? sp.q : undefined,
    pagamento: pickOption(sp.pagamento, ["aberto", "atrasado", "quitado"] as const),
    since: sinceFromParam(sp.periodo),
    sort: pickOption(sp.sort, PEDIDO_SORT_OPTIONS) as PedidoSort | undefined,
    // `previsao=30dias` (link do painel) sobrepõe o status, como na query.
    vencimentoProximos30Dias: previsaoAtiva ? true : undefined,
    statusIn: !previsaoAtiva && status === PEDIDO_ABERTO ? PEDIDOS_ABERTOS_STATUSES : undefined,
    status:
      !previsaoAtiva && status !== PEDIDO_ABERTO
        ? (pickOption(status, PEDIDO_STATUS_LABELS) as PedidoStatusFilter | undefined)
        : undefined,
  };
}
export type PedidoListOptions = ReturnType<typeof parsePedidoListParams>;
