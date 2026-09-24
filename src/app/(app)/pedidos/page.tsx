import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchBox } from "@/components/search-box";
import { formatCents } from "@/core/money";
import { formatDate } from "@/core/format";
import { listPedidos, type PedidoStatusFilter } from "@/modules/pedidos/queries";
import { PedidoStatusBadge } from "@/modules/pedidos/components/pedido-status-badge";

export default async function PedidosPage({ searchParams }: PageProps<"/pedidos">) {
  const { q, status } = await searchParams;
  const search = typeof q === "string" ? q : undefined;
  const statusFilter = typeof status === "string" ? (status as PedidoStatusFilter) : undefined;
  const pedidos = await listPedidos({ search, status: statusFilter });

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

      <SearchBox placeholder="Buscar por cliente ou número..." />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Entrega</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pedidos.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground text-center">
                Nenhum pedido cadastrado ainda.
              </TableCell>
            </TableRow>
          )}
          {pedidos.map((pedido) => (
            <TableRow key={pedido.id} className="cursor-pointer">
              <TableCell>
                <Link href={`/pedidos/${pedido.id}`} className="font-medium hover:underline">
                  #{pedido.number}
                </Link>
              </TableCell>
              <TableCell>{pedido.customerName}</TableCell>
              <TableCell>
                <PedidoStatusBadge status={pedido.status} />
              </TableCell>
              <TableCell>{pedido.deliveryDate ? formatDate(pedido.deliveryDate) : "—"}</TableCell>
              <TableCell className="text-right">{formatCents(pedido.totalCents)}</TableCell>
              <TableCell className="text-right">{formatCents(pedido.saldoCents ?? 0)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
