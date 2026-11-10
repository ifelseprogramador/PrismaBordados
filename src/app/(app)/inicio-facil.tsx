import {
  AlertTriangle,
  CalendarClock,
  CalendarX,
  ClipboardList,
  Factory,
  FileCheck,
  HandCoins,
  LayoutDashboard,
  Scale,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { getActiveOrg } from "@/core/auth";
import { formatDate } from "@/core/format";
import { formatCents } from "@/core/money";
import type { ModuleDefinition } from "@/core/registry";
import { EntradasSaidasChart } from "@/modules/financeiro";
import { PEDIDO_STATUS_LABELS } from "@/modules/pedidos/components/pedido-status-badge";
import { FacilGrid } from "@/components/layout/facil-grid";
import { FacilKpi, FacilKpis } from "@/components/facil/facil-kpi";
import { FacilList } from "@/components/facil/facil-list";
import { FacilPage } from "@/components/facil/facil-page";
import { loadPainelData } from "./painel-data";

/**
 * Início do modo Fácil. TODA métrica do painel formal (`page.tsx`) existe
 * aqui também — mesmos dados (`loadPainelData`), só apresentados em cards
 * grandes, sem tabela nem jargão. Métrica nova no painel formal ⇒ entra
 * nos dois (regra em docs/decisoes.md). Cada bloco só aparece se a pessoa
 * tem acesso ao módulo.
 */
export async function InicioFacil({
  org,
  modules,
}: {
  org: Awaited<ReturnType<typeof getActiveOrg>>;
  modules: ModuleDefinition[];
}) {
  const {
    pedidosSummary,
    clientes,
    financeiroSummary,
    entradasSaidasPorMes,
    clientesDevendo,
    previsaoRecebimentos,
    previsaoDespesas,
    totalDevidoGeralCents,
    saldoPrevisto30DiasCents,
  } = await loadPainelData(org);

  // Cada grupo de métricas vira uma seção com título curto.
  const pedidosKpis: React.ReactNode[] = [];
  if (pedidosSummary) {
    pedidosKpis.push(
      <FacilKpi
        key="abertos"
        icon={ClipboardList}
        label="Pedidos em aberto"
        value={pedidosSummary.openCount}
        href="/pedidos?status=aberto"
        index={0}
      />,
      <FacilKpi
        key="aprovacao"
        icon={FileCheck}
        label="Aguardando aprovação"
        value={pedidosSummary.awaitingApprovalCount}
        href="/pedidos?status=orcamento"
        index={1}
      />,
      <FacilKpi
        key="producao"
        icon={Factory}
        label="Em produção"
        value={pedidosSummary.inProgressCount}
        href="/pedidos?status=em_producao"
        index={2}
      />,
    );
  }
  if (clientes) {
    pedidosKpis.push(
      <FacilKpi
        key="clientes"
        icon={Users}
        label="Clientes cadastrados"
        value={clientes.length}
        href="/clientes"
        index={3}
      />,
    );
  }

  const financeiroKpis: React.ReactNode[] = [];
  if (financeiroSummary) {
    financeiroKpis.push(
      <FacilKpi
        key="entradas"
        icon={Wallet}
        label="Entradas do mês"
        value={formatCents(financeiroSummary.entradasCents)}
        href="/financeiro"
        index={0}
      />,
      <FacilKpi
        key="saidas"
        icon={TrendingDown}
        label="Saídas do mês"
        value={formatCents(financeiroSummary.saidasCents)}
        href="/financeiro"
        index={1}
      />,
      <FacilKpi
        key="lucro"
        icon={TrendingUp}
        label="Lucro do mês"
        value={formatCents(financeiroSummary.lucroCents)}
        href="/financeiro"
        index={2}
      />,
    );
  }
  if (pedidosSummary) {
    financeiroKpis.push(
      <FacilKpi
        key="receber"
        icon={HandCoins}
        label="Saldo a receber"
        value={formatCents(pedidosSummary.receivableCents)}
        hint="Pedidos ainda em andamento"
        href="/pedidos?status=aberto"
        index={3}
      />,
    );
  }

  const temPrevisao =
    pedidosSummary && financeiroSummary && previsaoRecebimentos && previsaoDespesas;

  return (
    <FacilPage
      title="O que você quer fazer?"
      subtitle={org.organizationName}
      icon={LayoutDashboard}
    >
      {pedidosKpis.length > 0 && (
        <Secao titulo="Pedidos e clientes">
          <FacilKpis>{pedidosKpis}</FacilKpis>
        </Secao>
      )}

      {financeiroKpis.length > 0 && (
        <Secao titulo="Financeiro do mês">
          <FacilKpis>{financeiroKpis}</FacilKpis>
        </Secao>
      )}

      {temPrevisao && (
        <Secao titulo="Previsão de caixa (próximos 30 dias)">
          <FacilKpis>
            <FacilKpi
              icon={CalendarClock}
              label="A receber"
              value={formatCents(previsaoRecebimentos.proximos30DiasCents)}
              href="/pedidos?previsao=30dias"
              index={0}
            />
            <FacilKpi
              icon={CalendarX}
              label="A pagar"
              value={formatCents(previsaoDespesas.proximos30DiasCents)}
              href="/financeiro?previsao=30dias"
              index={1}
            />
            <FacilKpi
              icon={Scale}
              label="Saldo previsto"
              value={formatCents(saldoPrevisto30DiasCents)}
              hint={saldoPrevisto30DiasCents >= 0 ? "Deve sobrar" : "Deve faltar"}
              index={2}
            />
          </FacilKpis>
          {previsaoRecebimentos.semPrevisaoCents > 0 && (
            <p className="text-muted-foreground text-sm">
              + {formatCents(previsaoRecebimentos.semPrevisaoCents)} em aberto sem vencimento
              definido (não entra na conta porque não tem data para prever).
            </p>
          )}
        </Secao>
      )}

      {entradasSaidasPorMes && (
        <Secao titulo="Entradas x saídas (últimos 6 meses)">
          <div className="bg-card rounded-2xl p-4 shadow-xs ring-1 ring-black/5 dark:ring-white/10">
            <EntradasSaidasChart data={entradasSaidasPorMes} />
          </div>
        </Secao>
      )}

      {pedidosSummary && (
        <Secao titulo="Pedidos recentes">
          <FacilList
            items={pedidosSummary.recent.map((pedido) => ({
              id: pedido.id,
              href: `/pedidos/${pedido.id}`,
              title: `#${pedido.number} — ${pedido.customerName}`,
              subtitle: formatCents(pedido.totalCents),
              badge: PEDIDO_STATUS_LABELS[pedido.status],
              icon: ClipboardList,
            }))}
            emptyTitle="Nenhum pedido cadastrado ainda"
            moreHref="/pedidos"
          />
        </Secao>
      )}

      {clientesDevendo && (
        <Secao
          titulo={`Clientes devendo${
            clientesDevendo.length > 0 ? ` — total ${formatCents(totalDevidoGeralCents)}` : ""
          }`}
        >
          <FacilList
            items={clientesDevendo.map((cliente) => {
              const recebido = cliente.totalPagoCents + cliente.totalDevidoCents;
              const pctPago =
                recebido > 0 ? Math.round((cliente.totalPagoCents / recebido) * 100) : 0;
              const vence = cliente.proximoVencimento
                ? `vence ${formatDate(cliente.proximoVencimento)}`
                : "sem vencimento";
              return {
                id: cliente.clienteId,
                href: `/clientes/${cliente.clienteId}`,
                title: cliente.clienteName,
                subtitle: `Deve ${formatCents(cliente.totalDevidoCents)} · ${pctPago}% pago · ${vence} · pedidos ${cliente.pedidosEmAberto
                  .map((p) => `#${p.number}`)
                  .join(", ")}`,
                badge: cliente.atrasado ? "Atrasado" : undefined,
                icon: cliente.atrasado ? AlertTriangle : HandCoins,
              };
            })}
            emptyTitle="Nenhum cliente com saldo em aberto"
            limit={8}
            moreHref="/clientes"
          />
        </Secao>
      )}

      <Secao titulo="Módulos">
        <FacilGrid
          modules={modules}
          isOwner={org.role === "owner"}
          size="painel"
          includePainel={false}
        />
      </Secao>
    </FacilPage>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
      {children}
    </section>
  );
}
