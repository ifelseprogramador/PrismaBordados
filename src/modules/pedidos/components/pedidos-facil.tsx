import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Factory,
  FilterX,
  List,
  Plus,
  Wallet,
} from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { FacilFilters } from "@/components/facil/facil-filters";
import { hasActiveFilter } from "@/core/list-filters";
import { FacilKpi } from "@/components/facil/facil-kpi";
import { FacilModuleHome } from "@/components/facil/facil-page";
import { FacilList } from "@/components/facil/facil-list";
import { FacilTile } from "@/components/facil/facil-tile";
import { formatCents } from "@/core/money";
import { getPedidosDashboardSummary, listPedidos } from "../queries";
import { PEDIDO_STATUS_LABELS } from "./pedido-status-badge";
import {
  PEDIDO_ABERTO as ABERTO,
  PEDIDO_DEFAULT_SORT,
  PEDIDO_FILTERS,
  PEDIDO_SORT_CHOICES,
  type PedidoListOptions,
} from "../list-config";

const INITIAL_LIMIT = 12;

/**
 * Janela inicial dos Pedidos no modo Fácil: métricas (as mesmas do painel),
 * cards de ação que já filtram por situação, busca grande e os pedidos em
 * cards. Mesmas queries e mesmos filtros de URL da tela formal.
 */
export async function PedidosFacilHome({
  options,
  statusParam,
  showAll,
}: {
  options: PedidoListOptions;
  /** `?status=` cru da URL, só para o texto "Mostrando: …". */
  statusParam?: string;
  showAll: boolean;
}) {
  const status = statusParam;
  const previsaoAtiva = Boolean(options.vencimentoProximos30Dias);
  const filtered = hasActiveFilter(options);
  const [pedidos, summary] = await Promise.all([
    listPedidos(options),
    getPedidosDashboardSummary(),
  ]);
  const everything = showAll || filtered;
  const label = previsaoAtiva
    ? "Saldo vencendo nos próximos 30 dias"
    : status === ABERTO
      ? "Em aberto"
      : status
        ? PEDIDO_STATUS_LABELS[status as keyof typeof PEDIDO_STATUS_LABELS]
        : undefined;

  return (
    <FacilModuleHome
      title="Pedidos"
      subtitle={label ? `Mostrando: ${label}` : "Orçamentos e encomendas"}
      icon={ClipboardList}
      kpis={
        <>
          <FacilKpi
            icon={ClipboardList}
            label="Pedidos em aberto"
            value={summary.openCount}
            hint={`${summary.awaitingApprovalCount} aguardando aprovação`}
            index={0}
          />
          <FacilKpi
            icon={Factory}
            label="Em produção"
            value={summary.inProgressCount}
            href="/pedidos?status=em_producao"
            index={1}
          />
          <FacilKpi
            icon={Wallet}
            label="Saldo a receber"
            value={formatCents(summary.receivableCents)}
            href="/pedidos?previsao=30dias"
            index={2}
          />
        </>
      }
      actions={
        <>
          <FacilTile href="/pedidos/novo" label="Novo pedido" icon={Plus} size="lg" index={0} />
          <FacilTile
            href="/pedidos?status=orcamento"
            label="Aguardando aprovação"
            icon={Clock}
            size="lg"
            index={1}
          />
          <FacilTile
            href="/pedidos?status=em_producao"
            label="Em produção"
            icon={Factory}
            size="lg"
            index={2}
          />
          <FacilTile
            href="/pedidos?status=pronto"
            label="Prontos para entregar"
            icon={CheckCircle2}
            size="lg"
            index={3}
          />
          <FacilTile
            href="/pedidos?previsao=30dias"
            label="A receber em 30 dias"
            icon={CalendarClock}
            size="lg"
            index={4}
          />
          {filtered ? (
            <FacilTile href="/pedidos" label="Limpar filtro" icon={FilterX} size="lg" index={5} />
          ) : (
            !showAll && (
              <FacilTile
                href="/pedidos?ver=todos"
                label="Ver todos"
                icon={List}
                size="lg"
                index={5}
              />
            )
          )}
        </>
      }
    >
      {!previsaoAtiva && <SearchBox large placeholder="Buscar por cliente ou número" />}
      {!previsaoAtiva && (
        <FacilFilters
          filters={PEDIDO_FILTERS}
          sortOptions={PEDIDO_SORT_CHOICES}
          defaultSort={PEDIDO_DEFAULT_SORT}
        />
      )}
      <FacilList
        items={pedidos.map((pedido) => ({
          id: pedido.id,
          href: `/pedidos/${pedido.id}`,
          title: `Pedido nº ${pedido.number}`,
          subtitle: `${pedido.customerName} · ${formatCents(pedido.totalCents)}${
            (pedido.saldoCents ?? 0) > 0 ? ` · falta ${formatCents(pedido.saldoCents ?? 0)}` : ""
          }`,
          badge: PEDIDO_STATUS_LABELS[pedido.status],
          icon: ClipboardList,
        }))}
        limit={everything ? Number.POSITIVE_INFINITY : INITIAL_LIMIT}
        moreHref="/pedidos?ver=todos"
        emptyTitle={filtered ? "Nenhum pedido encontrado" : "Nenhum pedido ainda"}
        emptyHint={
          filtered ? "Tente outro filtro ou limpe a busca." : "Comece criando o primeiro pedido."
        }
        emptyAction={
          filtered ? undefined : (
            <FacilTile href="/pedidos/novo" label="Novo pedido" icon={Plus} size="lg" />
          )
        }
      />
    </FacilModuleHome>
  );
}
