import Link from "next/link";
import { ClipboardList, LayoutDashboard, Package, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveOrg } from "@/core/auth";
import { formatCents } from "@/core/money";
import { getPedidosDashboardSummary } from "@/modules/pedidos";
import { listClientes } from "@/modules/clientes/queries";
import { PedidoStatusBadge } from "@/modules/pedidos/components/pedido-status-badge";

/**
 * Dashboard do Prisma: cada módulo expõe `get<Modulo>DashboardSummary()`
 * pelo seu barrel (ver `src/modules/README.md`) — esta página só compõe,
 * nunca lê tabela de outro módulo diretamente. Primeiro exemplo concreto
 * do contrato "Dashboard" documentado ali, substituindo o shell de
 * placeholders herdado do BaseERP.
 */
export default async function DashboardPage() {
  const [org, pedidosSummary, clientes] = await Promise.all([
    getActiveOrg(),
    getPedidosDashboardSummary(),
    listClientes(),
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
        />
        <KpiCard
          icon={Package}
          label="Aguardando aprovação"
          value={String(pedidosSummary.awaitingApprovalCount)}
        />
        <KpiCard icon={Users} label="Clientes cadastrados" value={String(clientes.length)} />
        <KpiCard
          icon={LayoutDashboard}
          label="Em produção"
          value={String(pedidosSummary.inProgressCount)}
        />
        <KpiCard
          icon={ClipboardList}
          label="Saldo a receber"
          value={formatCents(pedidosSummary.receivableCents)}
        />
      </div>

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
                  <Link href={`/pedidos/${pedido.id}`} className="hover:underline">
                    #{pedido.number} — {pedido.customerName}
                  </Link>
                  <div className="flex items-center gap-2">
                    <PedidoStatusBadge status={pedido.status} />
                    <span className="text-muted-foreground">{formatCents(pedido.totalCents)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2 pt-6">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="bg-muted text-muted-foreground rounded-lg p-2">
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
