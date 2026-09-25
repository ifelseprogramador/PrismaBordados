import { BackButton } from "@/components/back-button";
import { listClientesForSelect } from "@/modules/clientes/queries";
import { PedidoForm } from "@/modules/pedidos/components/pedido-form";
import { criarPedidoComAdiantamento } from "./actions";

export default async function NovoPedidoPage() {
  const clientes = await listClientesForSelect();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <BackButton />
      <h1 className="text-2xl font-semibold tracking-tight">Novo pedido</h1>
      <PedidoForm clientes={clientes} action={criarPedidoComAdiantamento} />
    </div>
  );
}
