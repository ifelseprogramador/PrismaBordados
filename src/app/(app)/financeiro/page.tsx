import { Wallet, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionLink } from "@/components/action-link";
import { formatCents } from "@/core/money";
import {
  listLancamentos,
  getFinanceiroDashboardSummary,
  LancamentoForm,
  LancamentosTable,
} from "@/modules/financeiro";
import { listClientesComSaldoAReceber } from "@/modules/pedidos";
import { PagamentoClienteForm } from "./pagamento-cliente-form";

export default async function FinanceiroPage({ searchParams }: PageProps<"/financeiro">) {
  const { month, previsao } = await searchParams;
  const mes = typeof month === "string" ? month : undefined;
  const previsaoAtiva = previsao === "30dias";

  const [lancamentos, resumo, clientesDevendo] = await Promise.all([
    listLancamentos(previsaoAtiva ? { futuras: true } : mes ? { month: mes } : undefined),
    getFinanceiroDashboardSummary(),
    listClientesComSaldoAReceber(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Wallet className="text-primary h-6 w-6" />
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">Entradas do mês</p>
            <p className="text-2xl font-semibold tracking-tight">
              {formatCents(resumo.entradasCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">Saídas do mês</p>
            <p className="text-2xl font-semibold tracking-tight">
              {formatCents(resumo.saidasCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">Lucro do mês</p>
            <p className="text-2xl font-semibold tracking-tight">
              {formatCents(resumo.lucroCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receber pagamento de cliente</CardTitle>
          <CardDescription>
            Escolha um cliente com saldo em aberto e qual pedido dele está sendo pago — cria o
            lançamento de entrada e já abate do saldo do pedido, mesmo efeito de registrar direto na
            ficha do pedido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PagamentoClienteForm clientesDevendo={clientesDevendo} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo lançamento</CardTitle>
          <CardDescription>
            Para saídas (compra de material, despesa) ou uma entrada avulsa sem cliente por trás.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LancamentoForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">
              {previsaoAtiva
                ? "Lançamentos — saídas previstas (próximos 30 dias)"
                : `Lançamentos${mes ? ` — ${mes}` : ""}`}
            </CardTitle>
            {previsaoAtiva && (
              <ActionLink href="/financeiro" icon={X}>
                Limpar filtro
              </ActionLink>
            )}
          </div>
          {previsaoAtiva && (
            <CardDescription>
              Só saídas já lançadas com data depois de hoje (até 30 dias) — exatamente o que compõe
              o &quot;A pagar&quot; da Previsão de caixa no painel.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <LancamentosTable lancamentos={lancamentos} />
        </CardContent>
      </Card>
    </div>
  );
}
