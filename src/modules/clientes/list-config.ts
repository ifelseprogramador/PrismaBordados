import type { FilterField } from "@/components/list-filter-bar";
import { PERIOD_FILTER, pickOption, sinceFromParam } from "@/core/list-filters";
import { CLIENTE_SORT_OPTIONS, type ClienteSort } from "./queries";

/** Filtros e ordenação da lista de clientes — UMA definição para os dois layouts. */
export const CLIENTE_FILTERS: FilterField[] = [
  {
    param: "type",
    allLabel: "Todos os tipos",
    options: [
      { value: "pf", label: "Pessoa física" },
      { value: "pj", label: "Pessoa jurídica" },
    ],
  },
  { ...PERIOD_FILTER, allLabel: "Qualquer data de cadastro" },
];
export const CLIENTE_SORT_CHOICES = Object.entries(CLIENTE_SORT_OPTIONS).map(([value, label]) => ({
  value,
  label,
}));
export const CLIENTE_DEFAULT_SORT: ClienteSort = "name_asc";

export function parseClienteListParams(sp: Record<string, string | string[] | undefined>) {
  return {
    search: typeof sp.q === "string" ? sp.q : undefined,
    type: pickOption(sp.type, ["pf", "pj"] as const),
    since: sinceFromParam(sp.periodo),
    sort: pickOption(sp.sort, CLIENTE_SORT_OPTIONS) as ClienteSort | undefined,
  };
}
export type ClienteListOptions = ReturnType<typeof parseClienteListParams>;
