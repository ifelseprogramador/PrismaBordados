import {
  Banknote,
  CalendarDays,
  ClipboardList,
  HandCoins,
  ListChecks,
  Printer,
  Receipt,
  Scissors,
  UserRound,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { HistoryCard } from "@/components/history-card";
import { ShareDocumentButton } from "@/components/share-document-button";
import { FacilInfo } from "@/components/facil/facil-info";
import { FacilList } from "@/components/facil/facil-list";
import { FacilPage } from "@/components/facil/facil-page";
import { FacilActions, FacilTile } from "@/components/facil/facil-tile";
import type { ActionResult } from "@/core/action-result";
import { formatDate } from "@/core/format";
import { formatCents } from "@/core/money";
import { FiscalNotasList } from "@/modules/fiscal";
import { AdiantamentoForm } from "@/modules/pedidos/components/adiantamento-form";
import { PedidoItemForm } from "@/modules/pedidos/components/pedido-item-form";
import { PedidoItensTable } from "@/modules/pedidos/components/pedido-itens-table";
import { PedidoStatusActions } from "@/modules/pedidos/components/pedido-status-actions";
import {
  PEDIDO_STATUS_LABELS,
  PedidoStatusBadge,
} from "@/modules/pedidos/components/pedido-status-badge";
import { compartilharNota, compartilharPedido } from "./share-actions";
import { registrarRecebimentoPedido } from "./financeiro-actions";
import { deletePedidoCompleto } from "./delete-actions";
import { EmitirNotaButton } from "./emitir-nota-button";

// Tipos vindos das próprias funções, para não reescrever os formatos aqui.
type Pedido = NonNullable<
  Awaited<ReturnType<typeof import("@/modules/pedidos/queries").getPedidoById>>
>;
type Itens = Awaited<ReturnType<typeof import("@/modules/pedidos/queries").listPedidoItens>>;
type CatalogoItens = Awaited<
  ReturnType<typeof import("@/modules/catalogo-bordado/queries").listCatalogoBordadoItensForSelect>
>;
type Notas = React.ComponentProps<typeof FiscalNotasList>["notas"];

/**
 * Ficha do pedido no modo Fácil: situação com o botão grande do PRÓXIMO
 * PASSO (o mesmo `PedidoStatusActions` da tela formal), dados e valores em
 * linhas simples, itens em cards e cards de ação. Itens, recebimento e nota
 * fiscal só se abrem sob demanda (`?acao=itens|receber|nota`), reaproveitando
 * os formulários formais — a janela mostra só o necessário. Fica na camada de
 * rotas porque junta pedidos, financeiro e fiscal.
 */
export function PedidoFacilDetail({
  pedido,
  itens,
  catalogoItens,
  fiscalNotas,
  created,
  acao,
}: {
  pedido: Pedido;
  itens: Itens;
  catalogoItens: CatalogoItens;
  fiscalNotas: Notas;
  created: boolean;
  acao?: string;
}) {
  const here = `/pedidos/${pedido.id}`;
  const temNotaEmitida = fiscalNotas.some((nota) => nota.status === "emitida");
  const toggle = (name: string) => (acao === name ? here : `${here}?acao=${name}`);

  return (
    <FacilPage
      title={`Pedido nº ${pedido.number}`}
      subtitle={pedido.customerName}
      icon={ClipboardList}
      backHref="/pedidos"
      backLabel="Pedidos"
    >
      {created && (
        <p className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-emerald-100 p-4 text-center font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          Pedido criado com sucesso.
          <Link href="/pedidos/novo" className="underline">
            Criar outro
          </Link>
        </p>
      )}

      <div className="bg-card flex flex-col items-center gap-4 rounded-2xl p-5 text-center ring-1 ring-black/5 dark:ring-white/10">
        <PedidoStatusBadge status={pedido.status} />
        <p className="text-muted-foreground text-sm">
          Quando terminar esta etapa, avance o pedido:
        </p>
        <PedidoStatusActions pedidoId={pedido.id} status={pedido.status} />
      </div>

      <FacilInfo
        rows={[
          {
            icon: UserRound,
            label: "Cliente",
            value: pedido.customerName,
            href: `/clientes/${pedido.customerId}`,
          },
          { icon: CalendarDays, label: "Data do pedido", value: formatDate(pedido.orderDate) },
          {
            icon: CalendarDays,
            label: "Entrega",
            value: pedido.deliveryDate
              ? `${formatDate(pedido.deliveryDate)}${pedido.deliveryTime ? ` às ${pedido.deliveryTime}` : ""}`
              : null,
          },
          { icon: Banknote, label: "Total", value: formatCents(pedido.totalCents) },
          {
            icon: HandCoins,
            label: "Já recebido",
            value: pedido.adiantamentoCents > 0 ? formatCents(pedido.adiantamentoCents) : null,
          },
          { icon: Wallet, label: "Falta receber", value: formatCents(pedido.saldoCents ?? 0) },
          {
            icon: CalendarDays,
            label: "Vence em",
            value: pedido.paymentDueDate ? formatDate(pedido.paymentDueDate) : null,
          },
        ]}
      />

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Scissors className="text-primary h-6 w-6" />
          Itens do pedido
        </h2>
        <FacilList
          items={itens.map((item) => ({
            id: item.id,
            title: item.produto,
            subtitle:
              [item.modelo, item.tamanho, item.cor].filter(Boolean).join(" · ") ||
              `${Number(item.quantity)} × ${formatCents(item.unitPriceCents)}`,
            badge: formatCents(item.totalCents ?? 0),
            icon: Scissors,
          }))}
          emptyTitle="Nenhum item ainda"
          emptyHint="Adicione os produtos que serão bordados."
        />
      </section>

      <FacilActions>
        <FacilTile
          href={toggle("itens")}
          label={acao === "itens" ? "Fechar itens" : "Adicionar ou tirar itens"}
          icon={ListChecks}
          size="lg"
          index={0}
        />
        <FacilTile
          href={toggle("receber")}
          label={acao === "receber" ? "Fechar" : "Receber pagamento"}
          icon={HandCoins}
          size="lg"
          index={1}
        />
        <FacilTile
          href={toggle("nota")}
          label={acao === "nota" ? "Fechar nota" : "Nota fiscal"}
          icon={Receipt}
          size="lg"
          index={2}
        />
        <FacilTile href={`${here}/imprimir`} label="Imprimir" icon={Printer} size="lg" index={3} />
      </FacilActions>

      <div className="flex justify-center">
        <ShareDocumentButton
          action={compartilharPedido.bind(null, pedido.id) as () => Promise<ActionResult>}
          label={pedido.status === "orcamento" ? "Enviar orçamento" : "Enviar ao cliente"}
        />
      </div>

      {acao === "itens" && (
        <Card>
          <CardHeader>
            <CardTitle>Itens</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <PedidoItensTable pedidoId={pedido.id} itens={itens} />
            <PedidoItemForm pedidoId={pedido.id} catalogoItens={catalogoItens} />
          </CardContent>
        </Card>
      )}

      {acao === "receber" && (
        <Card>
          <CardHeader>
            <CardTitle>Receber pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <AdiantamentoForm
              key={pedido.updatedAt.toString()}
              pedidoId={pedido.id}
              adiantamentoCents={pedido.adiantamentoCents}
              headerVersion={pedido.headerVersion}
              paymentDueDate={pedido.paymentDueDate}
              action={registrarRecebimentoPedido.bind(null, pedido.id)}
            />
          </CardContent>
        </Card>
      )}

      {acao === "nota" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Nota fiscal</CardTitle>
            {pedido.status === "entregue" && <EmitirNotaButton pedidoId={pedido.id} />}
          </CardHeader>
          <CardContent>
            <FiscalNotasList
              notas={fiscalNotas}
              actions={(nota) =>
                nota.status === "emitida" ? (
                  <ShareDocumentButton
                    action={
                      compartilharNota.bind(null, pedido.id, nota.id) as () => Promise<ActionResult>
                    }
                    label="Enviar"
                    variant="ghost"
                  />
                ) : null
              }
            />
            {pedido.status !== "entregue" && (
              <p className="text-muted-foreground mt-2 text-sm">
                A nota só pode ser emitida depois que o pedido for entregue.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <HistoryCard
        entityTable="pedidos"
        entityId={pedido.id}
        labels={PEDIDO_STATUS_LABELS}
        createdBy={pedido.createdBy}
        createdAt={pedido.createdAt}
        updatedBy={pedido.updatedBy}
        updatedAt={pedido.updatedAt}
      />

      <div className="flex justify-center pt-2">
        <ConfirmDeleteButton
          title={`Apagar o pedido #${pedido.number}`}
          description={
            temNotaEmitida
              ? "Este pedido já tem nota fiscal EMITIDA. Apagar aqui apaga o pedido e a nota fiscal junto — a nota some do sistema, mas o documento emitido continua existindo perante o fisco (você é responsável por regularizar isso fora daqui, ex.: cancelamento formal). Tem certeza que quer apagar mesmo assim?"
              : "Remove o pedido e os itens dele. Não afeta o cliente. Essa ação não pode ser desfeita."
          }
          onConfirm={deletePedidoCompleto.bind(null, pedido.id)}
          redirectTo="/pedidos"
        />
      </div>
    </FacilPage>
  );
}
