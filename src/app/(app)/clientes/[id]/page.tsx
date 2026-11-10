import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { HistoryCard } from "@/components/history-card";
import { Badge } from "@/components/ui/badge";
import { EntityHeader } from "@/components/entity-header";
import { EmailBadge, PhoneBadge } from "@/components/contact-badges";
import { formatDocument } from "@/core/document";
import { Building2, IdCard, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClienteById, updateCliente } from "@/modules/clientes";
import { ClienteForm } from "@/modules/clientes/components/cliente-form";
import { ClientePrivacyActions } from "@/modules/clientes/components/cliente-privacy-actions";
import { exportarDadosCliente, solicitarExclusaoCliente } from "./privacy-actions";
import { getActiveOrg } from "@/core/auth";
import { canAccessModule } from "@/core/module-access";
import { formatCents } from "@/core/money";
import { getCurrentUiMode } from "@/core/profile/current-ui-mode";
// Composição entre módulos só aqui, na camada de rotas: pelo barrel público.
import { PEDIDO_STATUS_LABELS, listPedidosByClienteId } from "@/modules/pedidos";
import { ClienteFacilDetail } from "@/modules/clientes/components/cliente-facil-detail";

export default async function ClienteDetailPage({
  params,
  searchParams,
}: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const { editar } = await searchParams;
  const cliente = await getClienteById(id);

  if (!cliente) {
    notFound();
  }

  if ((await getCurrentUiMode()) === "facil") {
    // Pedidos do cliente só para quem tem acesso ao módulo (a query exige).
    const org = await getActiveOrg();
    const pedidos = canAccessModule(org.moduleAccess, "pedidos")
      ? (await listPedidosByClienteId(cliente.id)).map((pedido) => ({
          id: pedido.id,
          href: `/pedidos/${pedido.id}`,
          title: `Pedido nº ${pedido.number}`,
          subtitle: formatCents(pedido.totalCents),
          badge: PEDIDO_STATUS_LABELS[pedido.status],
        }))
      : null;
    return (
      <ClienteFacilDetail
        cliente={cliente}
        pedidos={pedidos}
        editing={editar === "1"}
        onExport={exportarDadosCliente.bind(null, cliente.id)}
        onExclusion={solicitarExclusaoCliente.bind(null, cliente.id)}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <EntityHeader
        title={cliente.name}
        subtitle={cliente.type === "pj" ? (cliente.tradeName ?? cliente.legalName) : null}
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
              {cliente.phone && <PhoneBadge phone={cliente.phone} />}
              {cliente.email && <EmailBadge email={cliente.email} />}
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
      <HistoryCard
        createdBy={cliente.createdBy}
        createdAt={cliente.createdAt}
        updatedBy={cliente.updatedBy}
        updatedAt={cliente.updatedAt}
      />
    </div>
  );
}
