import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { Badge } from "@/components/ui/badge";
import { EntityHeader } from "@/components/entity-header";
import { formatDocument } from "@/core/document";
import { Building2, IdCard, Phone, User } from "lucide-react";
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
      <EntityHeader
        title={cliente.name}
        subtitle={cliente.type === "pj" ? (cliente.tradeName ?? cliente.legalName) : cliente.email}
        back={<BackButton href="/clientes" />}
        actions={
          !cliente.anonymizedAt && (
            <ClientePrivacyActions
              clienteNome={cliente.name}
              onExport={exportarDadosCliente.bind(null, cliente.id)}
              onExclusion={solicitarExclusaoCliente.bind(null, cliente.id)}
            />
          )
        }
        badges={
          cliente.anonymizedAt ? (
            <Badge variant="outline">Anonimizado (LGPD)</Badge>
          ) : (
            <>
              <Badge variant="secondary">
                {cliente.type === "pj" ? (
                  <Building2 data-icon="inline-start" />
                ) : (
                  <User data-icon="inline-start" />
                )}
                {cliente.type === "pj" ? "Pessoa jurídica" : "Pessoa física"}
              </Badge>
              {cliente.document && (
                <Badge variant="outline">
                  <IdCard data-icon="inline-start" />
                  {formatDocument(cliente.document)}
                </Badge>
              )}
              {cliente.phone && (
                <Badge variant="outline">
                  <Phone data-icon="inline-start" />
                  {cliente.phone}
                </Badge>
              )}
            </>
          )
        }
      />

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
