import { Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/core/money";
import {
  listLancamentos,
  getFinanceiroDashboardSummary,
  LancamentoForm,
  LancamentosTable,
} from "@/modules/financeiro";

export default async function FinanceiroPage({ searchParams }: PageProps<"/financeiro">) {
  const { month } = await searchParams;
  const mes = typeof month === "string" ? month : undefined;

  const [lancamentos, resumo] = await Promise.all([
    listLancamentos(mes ? { month: mes } : undefined),
    getFinanceiroDashboardSummary(),
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
          <CardTitle className="text-base">Novo lançamento</CardTitle>
        </CardHeader>
        <CardContent>
          <LancamentoForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lançamentos{mes ? ` — ${mes}` : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          <LancamentosTable lancamentos={lancamentos} />
        </CardContent>
      </Card>
    </div>
  );
}
