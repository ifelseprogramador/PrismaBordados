import { List, Package, Plus, Tag } from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { FacilFilters } from "@/components/facil/facil-filters";
import { hasActiveFilter } from "@/core/list-filters";
import { FacilKpi } from "@/components/facil/facil-kpi";
import { FacilModuleHome } from "@/components/facil/facil-page";
import { FacilList } from "@/components/facil/facil-list";
import { FacilTile } from "@/components/facil/facil-tile";
import { formatCents } from "@/core/money";
import { listCatalogoBordadoItens } from "../queries";
import {
  CATALOGO_DEFAULT_SORT,
  CATALOGO_FILTERS,
  CATALOGO_SORT_CHOICES,
  type CatalogoListOptions,
} from "../list-config";

const INITIAL_LIMIT = 12;

/**
 * Janela inicial do Catálogo no modo Fácil: total de produtos, cards de
 * ação, busca grande e os produtos em cards.
 */
export async function CatalogoFacilHome({
  options,
  showAll,
}: {
  options: CatalogoListOptions;
  showAll: boolean;
}) {
  const filtered = hasActiveFilter(options);
  // A métrica conta o catálogo inteiro, não só o resultado do filtro.
  const [itens, all] = await Promise.all([
    listCatalogoBordadoItens(options),
    listCatalogoBordadoItens(),
  ]);
  const everything = showAll || filtered;

  return (
    <FacilModuleHome
      title="Catálogo"
      subtitle="Os produtos que você borda"
      icon={Package}
      kpis={<FacilKpi icon={Package} label="Produtos no catálogo" value={all.length} index={0} />}
      actions={
        <>
          <FacilTile
            href="/catalogo-bordado/novo"
            label="Novo produto"
            icon={Plus}
            size="lg"
            index={0}
          />
          {!everything && (
            <FacilTile
              href="/catalogo-bordado?ver=todos"
              label="Ver todos"
              icon={List}
              size="lg"
              index={1}
            />
          )}
        </>
      }
    >
      <SearchBox large placeholder="Buscar produto pelo nome" />
      <FacilFilters
        filters={CATALOGO_FILTERS}
        sortOptions={CATALOGO_SORT_CHOICES}
        defaultSort={CATALOGO_DEFAULT_SORT}
      />
      <FacilList
        items={itens.map((item) => ({
          id: item.id,
          href: `/catalogo-bordado/${item.id}`,
          title: item.tipoProduto,
          subtitle: [item.modeloPadrao, formatCents(item.defaultPriceCents)]
            .filter(Boolean)
            .join(" · "),
          icon: Tag,
        }))}
        limit={everything ? Number.POSITIVE_INFINITY : INITIAL_LIMIT}
        moreHref="/catalogo-bordado?ver=todos"
        emptyTitle={filtered ? "Nenhum produto encontrado" : "O catálogo está vazio"}
        emptyHint={
          filtered ? "Tente outro filtro ou limpe a busca." : "Cadastre o primeiro produto."
        }
        emptyAction={
          filtered ? undefined : (
            <FacilTile href="/catalogo-bordado/novo" label="Novo produto" icon={Plus} size="lg" />
          )
        }
      />
    </FacilModuleHome>
  );
}
