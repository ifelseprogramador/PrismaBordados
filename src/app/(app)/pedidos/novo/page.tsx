import { BackButton } from "@/components/back-button";
import { listClientesForSelect } from "@/modules/clientes/queries";
import { PedidoForm } from "@/modules/pedidos/components/pedido-form";
import { criarPedidoComAdiantamento, criarPedidoComItens } from "./actions";
import { quickCreateCliente, searchClientesForPick } from "@/modules/clientes/pick-actions";
import {
  quickCreateCatalogoItem,
  searchCatalogoForPick,
} from "@/modules/catalogo-bordado/pick-actions";
import { NewPedidoFacil } from "@/modules/pedidos/components/new-pedido-facil";
import { FacilPage } from "@/components/facil/facil-page";
import { getCurrentUiMode } from "@/core/profile/current-ui-mode";
import { ClipboardList } from "lucide-react";

export default async function NovoPedidoPage() {
  // Modo Fácil primeiro: busca no servidor enquanto a pessoa digita, então nem
  // carrega a lista inteira de clientes (que pode ser enorme).
  if ((await getCurrentUiMode()) === "facil") {
    return (
      <FacilPage title="Novo pedido" icon={ClipboardList} backHref="/pedidos" backLabel="Pedidos">
        <NewPedidoFacil
          action={criarPedidoComItens}
          pickers={{
            searchClientes: searchClientesForPick,
            createCliente: quickCreateCliente,
            searchCatalogo: searchCatalogoForPick,
            createCatalogoItem: quickCreateCatalogoItem,
          }}
        />
      </FacilPage>
    );
  }

  const clientes = await listClientesForSelect();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <BackButton />
      <h1 className="text-2xl font-semibold tracking-tight">Novo pedido</h1>
      <PedidoForm clientes={clientes} action={criarPedidoComAdiantamento} />
    </div>
  );
}
