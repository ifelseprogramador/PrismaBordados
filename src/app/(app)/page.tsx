import Link from "next/link";
import { ClipboardList, LayoutDashboard, Package, Users, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionLink } from "@/components/action-link";
import { getActiveOrg } from "@/core/auth";
import { formatCents } from "@/core/money";
import { getPedidosDashboardSummary } from "@/modules/pedidos";
import { listClientes } from "@/modules/clientes/queries";
import { PedidoStatusBadge } from "@/modules/pedidos/components/pedido-status-badge";
import {
  getFinanceiroDashboardSummary,
  getEntradasSaidasPorMes,
  EntradasSaidasChart,
} from "@/modules/financeiro";

/**
 * Dashboard do Prisma: cada módulo expõe `get<Modulo>DashboardSummary()`
 * pelo seu barrel (ver `src/modules/README.md`) — esta página só compõe,
 * nunca lê tabela de outro módulo diretamente. "Lucro do mês" (
 * `financeiro`, entradas − saídas) e "Saldo a receber" (`pedidos`, soma
 * de `saldoCents` de pedidos não terminais) são métricas DIFERENTES,
 * mostradas lado a lado, nunca somadas (ver docs/decisoes.md) — a
 * planilha antiga da empresa aparentemente confundia as duas.
 *
 * Cada card de contagem/valor é clicável e leva para a lista já filtrada
 * com o mesmo critério que ele soma (ex.: "Pedidos em aberto" ->
 * `/pedidos?status=aberto`) — sem isso o número era só uma estatística
 * solta, sem jeito de ver quais pedidos exatamente compõem aquele total.
 */
export default async function DashboardPage() {
  const [org, pedidosSummary, clientes, financeiroSummary, entradasSaidasPorMes] =
    await Promise.all([
      getActiveOrg(),
      getPedidosDashboardSummary(),
      listClientes(),
      getFinanceiroDashboardSummary(),
      getEntradasSaidasPorMes(6),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
        <p className="text-muted-foreground text-sm">{org.organizationName}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          icon={ClipboardList}
          label="Pedidos em aberto"
          value={String(pedidosSummary.openCount)}
          href="/pedidos?status=aberto"
        />
        <KpiCard
          icon={Package}
          label="Aguardando aprovação"
          value={String(pedidosSummary.awaitingApprovalCount)}
          href="/pedidos?status=orcamento"
        />
        <KpiCard
          icon={Users}
          label="Clientes cadastrados"
          value={String(clientes.length)}
          href="/clientes"
        />
        <KpiCard
          icon={LayoutDashboard}
          label="Em produção"
          value={String(pedidosSummary.inProgressCount)}
          href="/pedidos?status=em_producao"
        />
        <KpiCard
          icon={Wallet}
          label="Entradas do mês"
          value={formatCents(financeiroSummary.entradasCents)}
          href="/financeiro"
        />
        <KpiCard
          icon={Wallet}
          label="Saídas do mês"
          value={formatCents(financeiroSummary.saidasCents)}
          href="/financeiro"
        />
        <KpiCard
          icon={Wallet}
          label="Lucro do mês"
          value={formatCents(financeiroSummary.lucroCents)}
          href="/financeiro"
        />
        <KpiCard
          icon={ClipboardList}
          label="Saldo a receber"
          value={formatCents(pedidosSummary.receivableCents)}
          href="/pedidos?status=aberto"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="text-primary h-4 w-4" />
              Entradas x saídas (últimos 6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EntradasSaidasChart data={entradasSaidasPorMes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutDashboard className="text-primary h-4 w-4" />
              Pedidos recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pedidosSummary.recent.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum pedido cadastrado ainda.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {pedidosSummary.recent.map((pedido) => (
                  <li key={pedido.id} className="flex items-center justify-between text-sm">
                    <ActionLink href={`/pedidos/${pedido.id}`}>
                      #{pedido.number} — {pedido.customerName}
                    </ActionLink>
                    <div className="flex items-center gap-2">
                      <PedidoStatusBadge status={pedido.status} />
                      <span className="text-muted-foreground">
                        {formatCents(pedido.totalCents)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="group-hover:border-primary/50 transition-colors">
        <CardContent className="flex items-start justify-between gap-2 pt-6">
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="group-hover:text-primary text-2xl font-semibold tracking-tight transition-colors">
              {value}
            </p>
          </div>
          <div className="bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary rounded-lg p-2 transition-colors">
            <Icon className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
