import type { FilterField } from "@/components/list-filter-bar";
import { PERIOD_FILTER, pickOption, sinceFromParam } from "@/core/list-filters";
import { LANCAMENTO_SORT_OPTIONS, type LancamentoSort } from "./queries";
import { LANCAMENTO_CATEGORIA_LABELS } from "./validation";

/** Filtros e ordenação dos lançamentos — UMA definição para os dois layouts. */
export const LANCAMENTO_FILTERS: FilterField[] = [
  {
    param: "tipo",
    allLabel: "Entradas e saídas",
    options: [
      { value: "entrada", label: "Só entradas" },
      { value: "saida", label: "Só saídas" },
    ],
  },
  {
    param: "categoria",
    allLabel: "Todas as categorias",
    options: Object.entries(LANCAMENTO_CATEGORIA_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  },
  { ...PERIOD_FILTER, allLabel: "Qualquer data" },
];
export const LANCAMENTO_SORT_CHOICES = Object.entries(LANCAMENTO_SORT_OPTIONS).map(
  ([value, label]) => ({ value, label }),
);
export const LANCAMENTO_DEFAULT_SORT: LancamentoSort = "date_desc";

export function parseLancamentoListParams(sp: Record<string, string | string[] | undefined>) {
  const month = typeof sp.month === "string" ? sp.month : undefined;
  return {
    search: typeof sp.q === "string" ? sp.q : undefined,
    type: pickOption(sp.tipo, ["entrada", "saida"] as const),
    categoria: pickOption(sp.categoria, LANCAMENTO_CATEGORIA_LABELS),
    since: sinceFromParam(sp.periodo),
    sort: pickOption(sp.sort, LANCAMENTO_SORT_OPTIONS) as LancamentoSort | undefined,
    // Links do painel: `?previsao=30dias` (saídas futuras) e `?month=AAAA-MM`.
    futuras: sp.previsao === "30dias" ? true : undefined,
    month: sp.previsao !== "30dias" ? month : undefined,
  };
}
export type LancamentoListOptions = ReturnType<typeof parseLancamentoListParams>;
