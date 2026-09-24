import { notFound } from "next/navigation";
import { formatCents } from "@/core/money";
import { formatDate } from "@/core/format";
import { getActiveOrg } from "@/core/auth";
import { getPedidoById, listPedidoItens } from "@/modules/pedidos/queries";
import { PedidoStatusBadge } from "@/modules/pedidos/components/pedido-status-badge";
import { AutoPrint } from "@/components/auto-print";

/**
 * Impressão/PDF sem dependência nenhuma: CSS puro (`print:`, ver
 * `(app)/layout.tsx` escondendo a barra lateral/topo) + o diálogo nativo
 * de impressão do navegador (Ctrl+P, que também serve pra "salvar como
 * PDF"), aberto sozinho por `<AutoPrint />` — mesmo padrão do
 * mecano-erp. Reproduz os elementos do formulário físico da MZ Bordados
 * usado como referência: aviso de responsabilidade e linha de
 * confirmação de recebimento com campo de assinatura.
 */
export default async function ImprimirPedidoPage({ params }: PageProps<"/pedidos/[id]/imprimir">) {
  const { id } = await params;
  const [pedido, itens, org] = await Promise.all([
    getPedidoById(id),
    listPedidoItens(id),
    getActiveOrg(),
  ]);

  if (!pedido) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6 text-sm">
      <AutoPrint />
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-semibold">{org.organizationName}</h1>
          <p className="text-muted-foreground">Pedido nº {pedido.number}</p>
        </div>
        <div className="text-right">
          <PedidoStatusBadge status={pedido.status} />
          <p className="text-muted-foreground mt-1">Emitido em {formatDate(pedido.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="font-semibold">Cliente</h2>
          <p>{pedido.customerName}</p>
          {pedido.customerPhone && <p className="text-muted-foreground">{pedido.customerPhone}</p>}
          {pedido.customerDocument && (
            <p className="text-muted-foreground">{pedido.customerDocument}</p>
          )}
          {pedido.customerAddress && (
            <p className="text-muted-foreground">{pedido.customerAddress}</p>
          )}
        </div>
        <div>
          <h2 className="font-semibold">Datas</h2>
          <p>Pedido: {formatDate(pedido.orderDate)}</p>
          <p>
            Entrega: {pedido.deliveryDate ? formatDate(pedido.deliveryDate) : "—"}
            {pedido.deliveryTime ? ` às ${pedido.deliveryTime}` : ""}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Itens</h2>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b">
              <th className="py-1">Produto</th>
              <th className="py-1">Modelo</th>
              <th className="py-1">Tam.</th>
              <th className="py-1">Cor</th>
              <th className="py-1">Qtd.</th>
              <th className="py-1">Valor unit.</th>
              <th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-1">{item.produto}</td>
                <td className="py-1">{item.modelo ?? "—"}</td>
                <td className="py-1">{item.tamanho ?? "—"}</td>
                <td className="py-1">{item.cor ?? "—"}</td>
                <td className="py-1">{item.quantity}</td>
                <td className="py-1">{formatCents(item.unitPriceCents)}</td>
                <td className="py-1 text-right">{formatCents(item.totalCents ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 flex flex-col items-end gap-1">
          <p>Total: {formatCents(pedido.totalCents)}</p>
          <p>Adiantamento: {formatCents(pedido.adiantamentoCents)}</p>
          <p className="text-base font-semibold">Saldo: {formatCents(pedido.saldoCents ?? 0)}</p>
        </div>
      </div>

      <p className="text-muted-foreground border-t pt-4 text-xs">
        Nos responsabilizamos apenas por bordados e peças compradas em nossa loja.
      </p>

      <div className="mt-4 flex flex-col gap-2 border-t pt-4">
        <p>Recebi a(s) mercadoria(s) acima em perfeito estado.</p>
        <div className="mt-8 grid grid-cols-2 gap-8 text-center">
          <div className="border-t pt-1">Data</div>
          <div className="border-t pt-1">Assinatura / nome do cliente</div>
        </div>
      </div>
    </div>
  );
}
