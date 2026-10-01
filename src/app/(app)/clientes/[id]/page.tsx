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
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 basis-60 items-start gap-2">
          <span className="shrink-0">
            <BackButton href="/clientes" />
          </span>
          <h1
            title={cliente.name}
            className="min-w-0 text-xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-2xl"
          >
            {cliente.name}
          </h1>
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
