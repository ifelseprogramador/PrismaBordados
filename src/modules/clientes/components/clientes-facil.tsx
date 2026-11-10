import { FileDown, FileUp, List, UserPlus, Users } from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { FacilFilters } from "@/components/facil/facil-filters";
import { hasActiveFilter } from "@/core/list-filters";
import { FacilKpi } from "@/components/facil/facil-kpi";
import { FacilModuleHome } from "@/components/facil/facil-page";
import { FacilList } from "@/components/facil/facil-list";
import { FacilTile } from "@/components/facil/facil-tile";
import { listClientes } from "../queries";
import {
  CLIENTE_DEFAULT_SORT,
  CLIENTE_FILTERS,
  CLIENTE_SORT_CHOICES,
  type ClienteListOptions,
} from "../list-config";

/** Quantos clientes aparecem de início; o resto fica em "Ver todos". */
const INITIAL_LIMIT = 12;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Quantos cadastros são dos últimos 30 dias. Fora do componente: `Date.now()`
 * é impuro e não pode ser chamado durante a renderização. */
export function countNewLast30Days(clientes: { createdAt: Date }[], now = Date.now()): number {
  return clientes.filter((cliente) => cliente.createdAt.getTime() >= now - THIRTY_DAYS_MS).length;
}

/**
 * Janela inicial de Clientes no modo Fácil: métricas, cards de ação, busca
 * grande e os clientes mais recentes em cards. Usa a mesma query da tela
 * formal (`listClientes`) — as métricas saem da própria lista, sem consulta
 * extra. Com busca ou "Ver todos" (`?ver=todos`) mostra a lista inteira.
 */
export async function ClientesFacilHome({
  options,
  showAll,
}: {
  options: ClienteListOptions;
  showAll: boolean;
}) {
  const filtered = hasActiveFilter(options);
  const clientes = await listClientes(options);
  const everything = showAll || filtered;

  // Métricas do cadastro inteiro, não do resultado do filtro.
  const base = filtered ? await listClientes({ sort: "created_desc" }) : clientes;
  const novos = countNewLast30Days(base);

  return (
    <FacilModuleHome
      title="Clientes"
      subtitle="Quem compra de você"
      icon={Users}
      kpis={
        <>
          <FacilKpi icon={Users} label="Clientes cadastrados" value={base.length} index={0} />
          <FacilKpi icon={UserPlus} label="Novos nos últimos 30 dias" value={novos} index={1} />
        </>
      }
      actions={
        <>
          <FacilTile
            href="/clientes/novo"
            label="Novo cliente"
            icon={UserPlus}
            size="lg"
            index={0}
          />
          {!everything && (
            <FacilTile
              href="/clientes?ver=todos"
              label="Ver todos"
              icon={List}
              size="lg"
              index={1}
            />
          )}
          <FacilTile
            href="/clientes/importar"
            label="Importar planilha"
            icon={FileUp}
            size="lg"
            index={2}
          />
          <FacilTile
            href="/clientes/exportar"
            label="Baixar planilha"
            icon={FileDown}
            size="lg"
            index={3}
            download
          />
        </>
      }
    >
      <SearchBox large placeholder="Buscar cliente pelo nome ou telefone" />
      <FacilFilters
        filters={CLIENTE_FILTERS}
        sortOptions={CLIENTE_SORT_CHOICES}
        defaultSort={CLIENTE_DEFAULT_SORT}
      />
      <FacilList
        items={clientes.map((cliente) => ({
          id: cliente.id,
          href: `/clientes/${cliente.id}`,
          title: cliente.name,
          subtitle: cliente.phone || undefined,
          badge: cliente.anonymizedAt
            ? "Anonimizado"
            : cliente.type === "pj"
              ? "Empresa"
              : undefined,
        }))}
        limit={everything ? Number.POSITIVE_INFINITY : INITIAL_LIMIT}
        moreHref="/clientes?ver=todos"
        emptyTitle={filtered ? "Nenhum cliente encontrado" : "Você ainda não tem clientes"}
        emptyHint={
          filtered ? "Tente outro filtro ou limpe a busca." : "Que tal cadastrar o primeiro agora?"
        }
        emptyAction={
          filtered ? undefined : (
            <FacilTile href="/clientes/novo" label="Novo cliente" icon={UserPlus} size="lg" />
          )
        }
      />
    </FacilModuleHome>
  );
}
