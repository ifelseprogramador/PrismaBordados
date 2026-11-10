import Link from "next/link";
import { ClipboardList, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SearchBox } from "@/components/search-box";
import { ActionLink } from "@/components/action-link";
import { ListFilterBar } from "@/components/list-filter-bar";
import { formatCents } from "@/core/money";
import { formatDate } from "@/core/format";
import { listPedidos } from "@/modules/pedidos/queries";
import {
  PEDIDO_DEFAULT_SORT,
  PEDIDO_FILTERS,
  PEDIDO_SORT_CHOICES,
  parsePedidoListParams,
} from "@/modules/pedidos/list-config";
import { isOverdue } from "@/modules/pedidos/domain";
import { PedidoStatusBadge } from "@/modules/pedidos/components/pedido-status-badge";
import { getCurrentUiMode } from "@/core/profile/current-ui-mode";
import { PedidosFacilHome } from "@/modules/pedidos/components/pedidos-facil";

export default async function PedidosPage({ searchParams }: PageProps<"/pedidos">) {
  const sp = await searchParams;
  const options = parsePedidoListParams(sp);
  const previsaoAtiva = Boolean(options.vencimentoProximos30Dias);

  if ((await getCurrentUiMode()) === "facil") {
    return (
      <PedidosFacilHome
        options={options}
        statusParam={typeof sp.status === "string" ? sp.status : undefined}
        showAll={sp.ver === "todos"}
      />
    );
  }

  const pedidos = await listPedidos(options);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <ClipboardList className="text-primary h-6 w-6" />
          <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
        </div>
        <Button nativeButton={false} render={<Link href="/pedidos/novo" />}>
          <Plus className="h-4 w-4" />
          Novo pedido
        </Button>
      </div>

      {previsaoAtiva ? (
        <div className="bg-muted/50 flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-sm">
          <span>
            Mostrando: pedidos com saldo vencendo nos próximos 30 dias — exatamente o que compõe o
            &quot;A receber&quot; da Previsão de caixa no painel.
          </span>
          <ActionLink href="/pedidos" icon={X}>
            Limpar filtro
          </ActionLink>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SearchBox placeholder="Buscar por cliente ou número..." />
          <ListFilterBar
            filters={PEDIDO_FILTERS}
            sortOptions={PEDIDO_SORT_CHOICES}
            defaultSort={PEDIDO_DEFAULT_SORT}
          />
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Status</TableHead>
            {previsaoAtiva ? <TableHead>Vencimento</TableHead> : <TableHead>Entrega</TableHead>}
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pedidos.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground text-center">
                Nenhum pedido encontrado.
              </TableCell>
            </TableRow>
          )}
          {pedidos.map((pedido) => (
            <TableRow key={pedido.id} className="cursor-pointer">
              <TableCell>
                <ActionLink href={`/pedidos/${pedido.id}`} className="font-medium">
                  #{pedido.number}
                </ActionLink>
              </TableCell>
              <TableCell>{pedido.customerName}</TableCell>
              <TableCell>
                <PedidoStatusBadge status={pedido.status} />
              </TableCell>
              {previsaoAtiva ? (
                <TableCell>
                  <div className="flex items-center gap-2">
                    {pedido.paymentDueDate ? formatDate(pedido.paymentDueDate) : "—"}
                    {isOverdue(pedido.paymentDueDate, pedido.saldoCents ?? 0) && (
                      <Badge variant="destructive">Atrasado</Badge>
                    )}
                  </div>
                </TableCell>
              ) : (
                <TableCell>{pedido.deliveryDate ? formatDate(pedido.deliveryDate) : "—"}</TableCell>
              )}
              <TableCell className="text-right">{formatCents(pedido.totalCents)}</TableCell>
              <TableCell className="text-right">{formatCents(pedido.saldoCents ?? 0)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
