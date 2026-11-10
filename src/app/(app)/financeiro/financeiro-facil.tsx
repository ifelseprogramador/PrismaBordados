import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  HandCoins,
  List,
  Table2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchBox } from "@/components/search-box";
import { FacilFilters } from "@/components/facil/facil-filters";
import { hasActiveFilter } from "@/core/list-filters";
import {
  LANCAMENTO_DEFAULT_SORT,
  LANCAMENTO_FILTERS,
  LANCAMENTO_SORT_CHOICES,
  type LancamentoListOptions,
} from "@/modules/financeiro/list-config";
import { FacilKpi } from "@/components/facil/facil-kpi";
import { FacilList } from "@/components/facil/facil-list";
import { FacilModuleHome, FacilPage } from "@/components/facil/facil-page";
import { FacilTile } from "@/components/facil/facil-tile";
import { formatDate } from "@/core/format";
import { formatCents } from "@/core/money";
import {
  LANCAMENTO_CATEGORIA_LABELS,
  LancamentosTable,
  getFinanceiroDashboardSummary,
  listLancamentos,
} from "@/modules/financeiro";
import { NewLancamentoFacil } from "@/modules/financeiro/components/new-lancamento-facil";
import { listClientesComSaldoAReceber } from "@/modules/pedidos";
import { PagamentoClienteForm } from "./pagamento-cliente-form";

const INITIAL_LIMIT = 12;

/**
 * Financeiro no modo Fácil. Uma rota, várias janelas pelo `?acao=`:
 * sem `acao` é a janela inicial (métricas, cards de ação, últimos
 * lançamentos); `entrada` / `saida` abrem o assistente de lançamento;
 * `receber` abre o recebimento de cliente; `?ver=tabela` abre a tabela
 * completa (único lugar onde dá para apagar um lançamento). Fica na camada de
 * rotas porque junta financeiro e pedidos.
 */
export async function FinanceiroFacil({
  acao,
  options,
  ver,
}: {
  acao?: string;
  options: LancamentoListOptions;
  ver?: string;
}) {
  const previsaoAtiva = Boolean(options.futuras);
  const filtered = hasActiveFilter(options);
  if (acao === "entrada" || acao === "saida") {
    return (
      <FacilPage
        title={acao === "entrada" ? "Registrar entrada" : "Registrar saída"}
        icon={acao === "entrada" ? ArrowDownCircle : ArrowUpCircle}
        backHref="/financeiro"
        backLabel="Financeiro"
      >
        <NewLancamentoFacil type={acao} />
      </FacilPage>
    );
  }

  if (acao === "receber") {
    const clientesDevendo = await listClientesComSaldoAReceber();
    return (
      <FacilPage
        title="Receber de cliente"
        subtitle="Escolha quem pagou e qual pedido foi pago"
        icon={HandCoins}
        backHref="/financeiro"
        backLabel="Financeiro"
      >
        <Card>
          <CardContent className="pt-6">
            <PagamentoClienteForm
              clientesDevendo={clientesDevendo}
              idempotencyKey={crypto.randomUUID()}
            />
          </CardContent>
        </Card>
      </FacilPage>
    );
  }

  const [lancamentos, resumo] = await Promise.all([
    listLancamentos(options),
    getFinanceiroDashboardSummary(),
  ]);

  if (ver === "tabela") {
    return (
      <FacilPage
        title="Todos os lançamentos"
        icon={Table2}
        backHref="/financeiro"
        backLabel="Financeiro"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lançamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <LancamentosTable lancamentos={lancamentos} />
          </CardContent>
        </Card>
      </FacilPage>
    );
  }

  const everything = ver === "todos" || filtered;

  return (
    <FacilModuleHome
      title="Financeiro"
      subtitle={
        previsaoAtiva
          ? "Mostrando: saídas previstas para os próximos 30 dias"
          : "O dinheiro do seu negócio"
      }
      icon={Wallet}
      kpis={
        <>
          <FacilKpi
            icon={TrendingUp}
            label="Entrou no mês"
            value={formatCents(resumo.entradasCents)}
            index={0}
          />
          <FacilKpi
            icon={TrendingDown}
            label="Saiu no mês"
            value={formatCents(resumo.saidasCents)}
            index={1}
          />
          <FacilKpi
            icon={Wallet}
            label="Lucro do mês"
            value={formatCents(resumo.lucroCents)}
            index={2}
          />
        </>
      }
      actions={
        <>
          <FacilTile
            href="/financeiro?acao=receber"
            label="Receber de cliente"
            icon={HandCoins}
            size="lg"
            index={0}
          />
          <FacilTile
            href="/financeiro?acao=saida"
            label="Registrar saída"
            icon={ArrowUpCircle}
            size="lg"
            index={1}
          />
          <FacilTile
            href="/financeiro?acao=entrada"
            label="Registrar entrada"
            icon={ArrowDownCircle}
            size="lg"
            index={2}
          />
          <FacilTile
            href="/financeiro?previsao=30dias"
            label="A pagar em 30 dias"
            icon={CalendarClock}
            size="lg"
            index={3}
          />
          {!everything && (
            <FacilTile
              href="/financeiro?ver=todos"
              label="Ver todos"
              icon={List}
              size="lg"
              index={4}
            />
          )}
          <FacilTile
            href="/financeiro?ver=tabela"
            label="Tabela completa"
            icon={Table2}
            size="lg"
            index={5}
          />
        </>
      }
    >
      {!previsaoAtiva && (
        <>
          <SearchBox large placeholder="Buscar lançamento pela descrição" />
          <FacilFilters
            filters={LANCAMENTO_FILTERS}
            sortOptions={LANCAMENTO_SORT_CHOICES}
            defaultSort={LANCAMENTO_DEFAULT_SORT}
          />
        </>
      )}
      <FacilList
        items={lancamentos.map((lancamento) => ({
          id: lancamento.id,
          title: lancamento.description || LANCAMENTO_CATEGORIA_LABELS[lancamento.categoria],
          subtitle: `${formatDate(lancamento.date)} · ${LANCAMENTO_CATEGORIA_LABELS[lancamento.categoria]}`,
          badge: `${lancamento.type === "entrada" ? "+" : "-"}${formatCents(lancamento.amountCents)}`,
          icon: lancamento.type === "entrada" ? ArrowDownCircle : ArrowUpCircle,
        }))}
        limit={everything ? Number.POSITIVE_INFINITY : INITIAL_LIMIT}
        moreHref="/financeiro?ver=todos"
        emptyTitle="Nenhum lançamento por aqui"
        emptyHint={
          filtered
            ? "Tente outro filtro ou limpe a busca."
            : "Registre uma entrada ou uma saída para começar."
        }
      />
    </FacilModuleHome>
  );
}
