import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/core/money";
import { formatDate } from "@/core/format";
import { getPedidoById, listPedidoItens } from "@/modules/pedidos/queries";
import { listCatalogoBordadoItensForSelect } from "@/modules/catalogo-bordado/queries";
import { PedidoStatusBadge } from "@/modules/pedidos/components/pedido-status-badge";
import { PedidoStatusActions } from "@/modules/pedidos/components/pedido-status-actions";
import { PedidoItensTable } from "@/modules/pedidos/components/pedido-itens-table";
import { PedidoItemForm } from "@/modules/pedidos/components/pedido-item-form";
import { AdiantamentoForm } from "@/modules/pedidos/components/adiantamento-form";

export default async function PedidoDetailPage({ params }: PageProps<"/pedidos/[id]">) {
  const { id } = await params;
  const [pedido, itens, catalogoItens] = await Promise.all([
    getPedidoById(id),
    listPedidoItens(id),
    listCatalogoBordadoItensForSelect(),
  ]);

  if (!pedido) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-2">
        <BackButton href="/pedidos" />
        <h1 className="text-2xl font-semibold tracking-tight">Pedido #{pedido.number}</h1>
        <PedidoStatusBadge status={pedido.status} />
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          nativeButton={false}
          render={<Link href={`/pedidos/${pedido.id}/imprimir`} target="_blank" />}
        >
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do pedido</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Cliente</p>
            <p className="font-medium">{pedido.customerName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Data do pedido</p>
            <p className="font-medium">{formatDate(pedido.orderDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Entrega</p>
            <p className="font-medium">
              {pedido.deliveryDate ? formatDate(pedido.deliveryDate) : "—"}
              {pedido.deliveryTime ? ` às ${pedido.deliveryTime}` : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent>
          <PedidoStatusActions pedidoId={pedido.id} status={pedido.status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itens</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <PedidoItensTable pedidoId={pedido.id} itens={itens} />
          <PedidoItemForm pedidoId={pedido.id} catalogoItens={catalogoItens} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Totais</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total do pedido</span>
            <span className="font-medium">{formatCents(pedido.totalCents)}</span>
          </div>
          <AdiantamentoForm pedidoId={pedido.id} adiantamentoCents={pedido.adiantamentoCents} />
          <div className="flex justify-between border-t pt-3">
            <span className="text-muted-foreground">Saldo a receber</span>
            <span className="text-base font-semibold">{formatCents(pedido.saldoCents ?? 0)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
