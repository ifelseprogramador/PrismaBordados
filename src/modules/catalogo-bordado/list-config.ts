import type { FilterField } from "@/components/list-filter-bar";
import { PERIOD_FILTER, pickOption, sinceFromParam } from "@/core/list-filters";
import { CATALOGO_BORDADO_SORT_OPTIONS, type CatalogoBordadoSort } from "./queries";

/** Filtros e ordenação da lista do catálogo — UMA definição para os dois layouts. */
export const CATALOGO_FILTERS: FilterField[] = [
  { ...PERIOD_FILTER, allLabel: "Qualquer data de cadastro" },
];
export const CATALOGO_SORT_CHOICES = Object.entries(CATALOGO_BORDADO_SORT_OPTIONS).map(
  ([value, label]) => ({ value, label }),
);
export const CATALOGO_DEFAULT_SORT: CatalogoBordadoSort = "tipo_asc";

export function parseCatalogoListParams(sp: Record<string, string | string[] | undefined>) {
  return {
    search: typeof sp.q === "string" ? sp.q : undefined,
    since: sinceFromParam(sp.periodo),
    sort: pickOption(sp.sort, CATALOGO_BORDADO_SORT_OPTIONS) as CatalogoBordadoSort | undefined,
  };
}
export type CatalogoListOptions = ReturnType<typeof parseCatalogoListParams>;
