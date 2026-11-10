import { Building2, IdCard, Mail, Pencil, Phone, ShoppingBag, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HistoryCard } from "@/components/history-card";
import { FacilPage } from "@/components/facil/facil-page";
import { FacilList, type FacilListItem } from "@/components/facil/facil-list";
import { FacilActions, FacilTile } from "@/components/facil/facil-tile";
import { formatDocument } from "@/core/document";
import type { ClienteComEndereco } from "../schema.types";
import { updateCliente } from "../actions";
import { ClienteForm } from "./cliente-form";
import { ClientePrivacyActions } from "./cliente-privacy-actions";

/**
 * Ficha do cliente no modo Fácil: dados principais em linhas simples, cards
 * de ação (editar, novo pedido) e os pedidos dele em cards. A edição completa
 * reaproveita o `ClienteForm` formal, escondido atrás de "Editar dados"
 * (`?editar=1`). `pedidos` vem da página (composição entre módulos acontece
 * na camada de rotas) e é `null` quando a pessoa não tem acesso a pedidos.
 */
export function ClienteFacilDetail({
  cliente,
  pedidos,
  editing,
  onExport,
  onExclusion,
}: {
  cliente: ClienteComEndereco;
  pedidos: FacilListItem[] | null;
  editing: boolean;
  onExport: React.ComponentProps<typeof ClientePrivacyActions>["onExport"];
  onExclusion: React.ComponentProps<typeof ClientePrivacyActions>["onExclusion"];
}) {
  const details = cliente.anonymizedAt
    ? []
    : [
        {
          icon: Phone,
          label: "Telefone",
          value: cliente.phone,
          href: cliente.phone ? `tel:${cliente.phone}` : undefined,
        },
        {
          icon: Mail,
          label: "E-mail",
          value: cliente.email,
          href: cliente.email ? `mailto:${cliente.email}` : undefined,
        },
        {
          icon: IdCard,
          label: "CPF/CNPJ",
          value: cliente.document ? formatDocument(cliente.document) : null,
          href: undefined,
        },
      ].filter((row) => row.value);

  return (
    <FacilPage
      title={cliente.name}
      subtitle={cliente.type === "pj" ? "Empresa" : "Pessoa"}
      icon={cliente.type === "pj" ? Building2 : User}
      backHref="/clientes"
      backLabel="Clientes"
    >
      {cliente.anonymizedAt && (
        <p className="bg-muted rounded-2xl p-4 text-center">
          Os dados pessoais deste cliente foram anonimizados a pedido do titular (LGPD) em{" "}
          {cliente.anonymizedAt.toLocaleDateString("pt-BR")}. O cadastro só continua existindo para
          manter o histórico de pedidos.
        </p>
      )}

      {details.length > 0 && (
        <dl className="bg-card divide-y rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
          {details.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="flex items-center gap-4 p-4">
              <Icon className="text-primary h-6 w-6 shrink-0" />
              <dt className="text-muted-foreground w-24 shrink-0">{label}</dt>
              <dd className="min-w-0 truncate text-lg font-medium">
                {href ? (
                  <a href={href} className="hover:underline">
                    {value}
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {!cliente.anonymizedAt && (
        <FacilActions>
          <FacilTile
            href={editing ? `/clientes/${cliente.id}` : `/clientes/${cliente.id}?editar=1`}
            label={editing ? "Fechar edição" : "Editar dados"}
            icon={Pencil}
            size="lg"
            index={0}
          />
          {pedidos && (
            <FacilTile
              href="/pedidos/novo"
              label="Novo pedido"
              icon={ShoppingBag}
              size="lg"
              index={1}
            />
          )}
        </FacilActions>
      )}

      {editing && !cliente.anonymizedAt && (
        <Card>
          <CardHeader>
            <CardTitle>Editar dados do cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <ClienteForm cliente={cliente} action={updateCliente.bind(null, cliente.id)} />
          </CardContent>
        </Card>
      )}

      {pedidos && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <ShoppingBag className="text-primary h-6 w-6" />
            Pedidos
          </h2>
          <FacilList
            items={pedidos}
            emptyTitle="Nenhum pedido ainda"
            emptyHint="Quando este cliente fizer um pedido, ele aparece aqui."
          />
        </section>
      )}

      <HistoryCard
        createdBy={cliente.createdBy}
        createdAt={cliente.createdAt}
        updatedBy={cliente.updatedBy}
        updatedAt={cliente.updatedAt}
      />

      {!cliente.anonymizedAt && (
        <div className="flex justify-center pt-2">
          <ClientePrivacyActions
            clienteNome={cliente.name}
            onExport={onExport}
            onExclusion={onExclusion}
          />
        </div>
      )}
    </FacilPage>
  );
}
