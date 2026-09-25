import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClienteById, updateCliente } from "@/modules/clientes";
import { ClienteForm } from "@/modules/clientes/components/cliente-form";
import { ClientePrivacyActions } from "@/modules/clientes/components/cliente-privacy-actions";
import { exportarDadosCliente, solicitarExclusaoCliente } from "./privacy-actions";

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
        {!cliente.anonymizedAt && (
          <ClientePrivacyActions
            clienteNome={cliente.name}
            onExport={exportarDadosCliente.bind(null, cliente.id)}
            onExclusion={solicitarExclusaoCliente.bind(null, cliente.id)}
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent>
          {cliente.anonymizedAt ? (
            <p className="text-muted-foreground text-sm">
              Os dados pessoais deste cliente foram anonimizados a pedido do titular (LGPD) em{" "}
              {cliente.anonymizedAt.toLocaleDateString("pt-BR")}. O cadastro continua existindo só
              para manter o histórico de pedidos consistente — não é mais editável.
            </p>
          ) : (
            <ClienteForm cliente={cliente} action={updateCliente.bind(null, cliente.id)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
