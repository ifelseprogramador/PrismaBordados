import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { getClienteById, deleteCliente, updateCliente } from "@/modules/clientes";
import { ClienteForm } from "@/modules/clientes/components/cliente-form";

export default async function ClienteDetailPage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const cliente = await getClienteById(id);

  if (!cliente) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BackButton href="/clientes" />
          <h1 className="text-2xl font-semibold tracking-tight">{cliente.name}</h1>
        </div>
        <ConfirmDeleteButton
          title="Remover cliente"
          description={`Tem certeza que deseja remover "${cliente.name}"? Essa ação não pode ser desfeita.`}
          onConfirm={deleteCliente.bind(null, cliente.id)}
          redirectTo="/clientes"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ClienteForm cliente={cliente} action={updateCliente.bind(null, cliente.id)} />
        </CardContent>
      </Card>
    </div>
  );
}
