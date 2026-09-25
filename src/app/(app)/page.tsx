import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  Package,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionLink } from "@/components/action-link";
import { Hint } from "@/components/hint";
import { cn } from "@/lib/utils";
import { getActiveOrg } from "@/core/auth";
import { formatCents } from "@/core/money";
import { formatDate } from "@/core/format";
import {
  getPedidosDashboardSummary,
  listClientesComSaldoAReceber,
  getPrevisaoRecebimentos,
} from "@/modules/pedidos";
import { listClientes } from "@/modules/clientes/queries";
import { PedidoStatusBadge } from "@/modules/pedidos/components/pedido-status-badge";
import {
  getFinanceiroDashboardSummary,
  getEntradasSaidasPorMes,
  getPrevisaoDespesas,
  EntradasSaidasChart,
} from "@/modules/financeiro";

/**
 * Dashboard do Prisma: cada módulo expõe `get<Modulo>DashboardSummary()`
 * pelo seu barrel (ver `src/modules/README.md`) — esta página só compõe,
 * nunca lê tabela de outro módulo diretamente. "Lucro do mês" (
 * `financeiro`, entradas − saídas) e "Saldo a receber" (`pedidos`, soma
 * de `saldoCents` de pedidos não terminais) são métricas DIFERENTES,
 * mostradas lado a lado, nunca somadas (ver docs/decisoes.md) — a
 * planilha antiga da empresa aparentemente confundia as duas.
 *
 * Cada card de contagem/valor é clicável e leva para a lista já filtrada
 * com o mesmo critério que ele soma (ex.: "Pedidos em aberto" ->
 * `/pedidos?status=aberto`) — sem isso o número era só uma estatística
 * solta, sem jeito de ver quais pedidos exatamente compõem aquele total.
 *
 * Passe de visual (2026-09-25, skill de dataviz consultada antes): tom
 * (`tone`) por KPI usando só os tokens semânticos do tema
 * (`--color-success`, alias de `chart-3`; `--color-warning`, cor âmbar
 * dedicada — ver `globals.css` para por que não reaproveitou `chart-5`,
 * validado como indistinguível de `destructive`) para agrupar
 * visualmente por assunto (pedidos = azul, entradas/lucro positivo =
 * verde, saídas/atrasado = vermelho, a receber = âmbar) sem perder a
 * hierarquia de texto (rótulo sempre em `muted-foreground`, nunca a cor
 * do tom — só o ícone e o valor usam `tone`, mesma regra de "texto nunca
 * veste a cor do dado" da skill).
 */
export default async function DashboardPage() {
  const [
    org,
    pedidosSummary,
    clientes,
    financeiroSummary,
    entradasSaidasPorMes,
    clientesDevendo,
    previsaoRecebimentos,
    previsaoDespesas,
  ] = await Promise.all([
    getActiveOrg(),
    getPedidosDashboardSummary(),
    listClientes(),
    getFinanceiroDashboardSummary(),
    getEntradasSaidasPorMes(6),
    listClientesComSaldoAReceber(),
    getPrevisaoRecebimentos(),
    getPrevisaoDespesas(),
  ]);

  const lucroTone = financeiroSummary.lucroCents >= 0 ? "success" : "destructive";
  const totalDevidoGeralCents = clientesDevendo.reduce((sum, c) => sum + c.totalDevidoCents, 0);
  const saldoPrevisto30DiasCents =
    previsaoRecebimentos.proximos30DiasCents - previsaoDespesas.proximos30DiasCents;
  const saldoPrevistoTone = saldoPrevisto30DiasCents >= 0 ? "success" : "destructive";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
        <p className="text-muted-foreground text-sm">{org.organizationName}</p>
      </div>

      <section className="flex flex-col gap-3">
        <SectionLabel>Pedidos e clientes</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={ClipboardList}
            label="Pedidos em aberto"
            value={String(pedidosSummary.openCount)}
            href="/pedidos?status=aberto"
            tone="primary"
          />
          <KpiCard
            icon={Package}
            label="Aguardando aprovação"
            value={String(pedidosSummary.awaitingApprovalCount)}
            href="/pedidos?status=orcamento"
            tone="primary"
          />
          <KpiCard
            icon={LayoutDashboard}
            label="Em produção"
            value={String(pedidosSummary.inProgressCount)}
            href="/pedidos?status=em_producao"
            tone="primary"
          />
          <KpiCard
            icon={Users}
            label="Clientes cadastrados"
            value={String(clientes.length)}
            href="/clientes"
            tone="neutral"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Financeiro do mês</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={Wallet}
            label="Entradas do mês"
            value={formatCents(financeiroSummary.entradasCents)}
            href="/financeiro"
            tone="success"
          />
          <KpiCard
            icon={Wallet}
            label="Saídas do mês"
            value={formatCents(financeiroSummary.saidasCents)}
            href="/financeiro"
            tone="destructive"
          />
          <KpiCard
            icon={TrendingUp}
            label="Lucro do mês"
            value={formatCents(financeiroSummary.lucroCents)}
            href="/financeiro"
            tone={lucroTone}
          />
          <KpiCard
            icon={ClipboardList}
            label="Saldo a receber"
            value={formatCents(pedidosSummary.receivableCents)}
            href="/pedidos?status=aberto"
            tone="warning"
            hint={
              <Hint>
                Soma o saldo de TODO pedido ainda em andamento (orçamento, aprovado, em produção,
                pronto), sem olhar vencimento — por isso é diferente de &quot;A receber&quot; da
                Previsão de caixa abaixo, que só conta quem tem vencimento nos próximos 30 dias e
                também inclui pedido já entregue (mas ainda não pago). Não é erro: são duas
                perguntas diferentes — esta é &quot;quanto ainda está em produção/aberto&quot;, a
                outra é &quot;quanto tenho previsão de entrar em dinheiro em breve&quot;.
              </Hint>
            }
          />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IconBadge icon={CalendarClock} tone="primary" />
            Previsão de caixa (próximos 30 dias)
          </CardTitle>
          <CardDescription>
            Uma projeção do que deve entrar e sair de dinheiro em breve, pra ajudar a planejar —
            diferente do resto do painel (que mostra o que já aconteceu), aqui é o que ainda vai
            acontecer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PrevisaoStat
              label="A receber"
              value={formatCents(previsaoRecebimentos.proximos30DiasCents)}
              href="/pedidos?previsao=30dias"
              tone="success"
              hint={
                <Hint>
                  Soma o saldo de pedidos com vencimento marcado entre hoje e daqui a 30 dias. NÃO
                  inclui pedido atrasado (isso já está em &quot;Clientes devendo&quot; acima) nem
                  pedido sem vencimento definido (mostrado à parte, abaixo). Clique pra ver a lista
                  de pedidos que compõem este número.
                </Hint>
              }
            />
            <PrevisaoStat
              label="A pagar"
              value={formatCents(previsaoDespesas.proximos30DiasCents)}
              href="/financeiro?previsao=30dias"
              tone="destructive"
              hint={
                <Hint>
                  Soma só as saídas que você JÁ lançou em Financeiro com data futura (até 30 dias) —
                  não existe despesa recorrente automática ainda, então cadastre com antecedência
                  qualquer conta que já sabe que vem por aí. Clique pra ver a lista de lançamentos
                  que compõem este número.
                </Hint>
              }
            />
            <PrevisaoStat
              label="Saldo previsto"
              value={formatCents(saldoPrevisto30DiasCents)}
              tone={saldoPrevistoTone}
            />
          </div>
          {previsaoRecebimentos.semPrevisaoCents > 0 && (
            <p className="text-muted-foreground mt-3 text-xs">
              + {formatCents(previsaoRecebimentos.semPrevisaoCents)} em aberto sem vencimento
              definido — não contado acima porque não tem data pra prever quando entra.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IconBadge icon={Wallet} tone="primary" />
              Entradas x saídas (últimos 6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EntradasSaidasChart data={entradasSaidasPorMes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IconBadge icon={LayoutDashboard} tone="primary" />
              Pedidos recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pedidosSummary.recent.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum pedido cadastrado ainda.</p>
            ) : (
              <ul className="flex flex-col">
                {pedidosSummary.recent.map((pedido) => (
                  <li
                    key={pedido.id}
                    className="hover:bg-muted/50 -mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm transition-colors"
                  >
                    <ActionLink href={`/pedidos/${pedido.id}`}>
                      #{pedido.number} — {pedido.customerName}
                    </ActionLink>
                    <div className="flex items-center gap-2">
                      <PedidoStatusBadge status={pedido.status} />
                      <span className="text-muted-foreground tabular-nums">
                        {formatCents(pedido.totalCents)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <IconBadge icon={AlertTriangle} tone="warning" />
                Clientes devendo
              </CardTitle>
              <CardDescription className="mt-1">
                Soma de todos os pedidos com saldo em aberto de cada cliente (inclui pedido já
                entregue, mas não pago) — diferente do KPI &quot;Saldo a receber&quot; acima, que só
                olha pedidos ainda em andamento.
              </CardDescription>
            </div>
            {clientesDevendo.length > 0 && (
              <div className="text-right">
                <p className="text-muted-foreground text-xs">Total em aberto</p>
                <p className="text-warning text-xl font-semibold tracking-tight tabular-nums">
                  {formatCents(totalDevidoGeralCents)}
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {clientesDevendo.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum cliente com saldo em aberto.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {clientesDevendo.map((cliente) => {
                const recebidoTotal = cliente.totalPagoCents + cliente.totalDevidoCents;
                const pctPago =
                  recebidoTotal > 0
                    ? Math.round((cliente.totalPagoCents / recebidoTotal) * 100)
                    : 0;

                return (
                  <li key={cliente.clienteId} className="flex flex-col gap-2 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {cliente.atrasado && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Atrasado
                          </Badge>
                        )}
                        <ActionLink href={`/clientes/${cliente.clienteId}`}>
                          {cliente.clienteName}
                        </ActionLink>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-muted-foreground text-xs">Pedidos:</span>
                        {cliente.pedidosEmAberto.map((pedido) => (
                          <ActionLink key={pedido.id} href={`/pedidos/${pedido.id}`}>
                            #{pedido.number}
                          </ActionLink>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full"
                        role="progressbar"
                        aria-valuenow={pctPago}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${cliente.clienteName}: ${pctPago}% pago`}
                      >
                        <div
                          className="bg-success h-full rounded-full"
                          style={{ width: `${pctPago}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                        {formatCents(cliente.totalPagoCents)} de {formatCents(recebidoTotal)} pago
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs">
                        {cliente.proximoVencimento
                          ? `Vence ${formatDate(cliente.proximoVencimento)}`
                          : "Sem vencimento definido"}
                      </span>
                      <span className="text-warning font-semibold tabular-nums">
                        Deve {formatCents(cliente.totalDevidoCents)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type Tone = "primary" | "success" | "warning" | "destructive" | "neutral";

const TONE_STYLES: Record<Tone, { icon: string; border: string; value: string }> = {
  primary: {
    icon: "bg-primary/10 text-primary",
    border: "group-hover:border-primary/40",
    value: "group-hover:text-primary",
  },
  success: {
    icon: "bg-success/10 text-success",
    border: "group-hover:border-success/40",
    value: "group-hover:text-success",
  },
  warning: {
    icon: "bg-warning/10 text-warning",
    border: "group-hover:border-warning/40",
    value: "group-hover:text-warning",
  },
  destructive: {
    icon: "bg-destructive/10 text-destructive",
    border: "group-hover:border-destructive/40",
    value: "group-hover:text-destructive",
  },
  neutral: {
    icon: "bg-muted text-muted-foreground",
    border: "group-hover:border-foreground/20",
    value: "",
  },
};

/** Rótulo pequeno de seção — quebra a grade de KPIs em grupos por
 * assunto (pedidos/clientes vs. financeiro), sem precisar de outro Card
 * só para isso. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
      {children}
    </h2>
  );
}

/** Selo de ícone tintado por `tone` — mesmo tratamento visual do ícone
 * do `KpiCard`, reaproveitado no título dos cards de conteúdo (gráfico,
 * listas) pra tudo no painel seguir a mesma linguagem visual. */
function IconBadge({
  icon: Icon,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
}) {
  return (
    <span className={cn("rounded-md p-1.5", TONE_STYLES[tone].icon)}>
      <Icon className="h-4 w-4" />
    </span>
  );
}

/**
 * `hint`, quando passado, precisa ficar ao lado do `Icon` do `Hint`
 * (um `<button>`) SEM ficar aninhado dentro do `<a>` que torna o card
 * clicável — HTML não permite `<button>` dentro de `<a>`. Por isso o
 * link não envolve o card inteiro (como antes): vira uma camada
 * absoluta (`absolute inset-0`) DENTRO do `Card`, do mesmo tamanho dele,
 * e o conteúdo visível fica por cima com `pointer-events-none` — exceto
 * a linha do rótulo+hint, que reativa `pointer-events-auto` só ali, pro
 * `Hint` continuar clicável. `group` migra pro `Card` (não muda o
 * resultado visual do `group-hover`: `:hover` já vale pro `Card` inteiro
 * mesmo passando o mouse sobre o link-camada, que é filho dele).
 *
 * PEGADINHA que já causou um bug real aqui: só `pointer-events` não
 * basta. Um elemento `position: absolute` (o `<Link>`) pinta ACIMA de
 * conteúdo não-posicionado no mesmo contexto de empilhamento, não importa
 * a ordem no DOM — então o `Link` ficava visualmente por cima do botão
 * do `Hint` mesmo com `pointer-events-auto` nele, e o hover nunca
 * chegava no botão (o navegador testa o elemento do TOPO visual, não só
 * quem tem `pointer-events` habilitado). Corrigido dando ao wrapper do
 * conteúdo (`CardContent`) `relative z-10` — agora ele também é
 * posicionado, com `z-index` maior que o do `Link` (que fica em 0/auto),
 * então pinta por cima de verdade.
 */
function KpiCard({
  icon: Icon,
  label,
  value,
  href,
  tone = "primary",
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href: string;
  tone?: Tone;
  hint?: React.ReactNode;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <Card
      className={cn(
        "group relative transition-all hover:-translate-y-0.5 hover:shadow-md",
        styles.border,
      )}
    >
      <Link href={href} aria-label={label} className="absolute inset-0" />
      <CardContent className="pointer-events-none relative z-10 flex items-start justify-between gap-3 pt-6">
        <div className="flex flex-col gap-1">
          <div className={cn("flex items-center gap-1.5", hint && "pointer-events-auto")}>
            <p className="text-muted-foreground text-sm">{label}</p>
            {hint}
          </div>
          <p
            className={cn(
              "text-2xl font-semibold tracking-tight tabular-nums transition-colors",
              styles.value,
            )}
          >
            {value}
          </p>
        </div>
        <div className={cn("rounded-lg p-2 transition-colors", styles.icon)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Uma estatística dentro do card "Previsão de caixa" — mesma elevação no
 * hover dos outros cards do painel (`hover:-translate-y-0.5 hover:shadow-md`),
 * em vez de sublinhado no link. Sem `href` (caso do "Saldo previsto",
 * que não tem pra onde levar) vira só texto estático, sem moldura nem
 * hover — só os dois que são clicáveis parecem clicáveis. Mesma técnica
 * de link em camada do `KpiCard` (evita `<button>` do `Hint` aninhado
 * dentro de `<a>`), aplicada aqui a uma "mini-card" em vez do card
 * inteiro — incluindo o `relative z-10` no wrapper do conteúdo (ver
 * comentário do `KpiCard` pra a pegadinha de stacking que isso resolve:
 * sem o `z-10`, o `Link` posicionado pinta por cima do botão do `Hint`
 * e o hover nunca chega nele, mesmo com `pointer-events-auto`).
 */
function PrevisaoStat({
  label,
  value,
  href,
  tone,
  hint,
}: {
  label: string;
  value: string;
  href?: string;
  tone: Tone;
  hint?: React.ReactNode;
}) {
  const valueColor =
    tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "";

  if (!href) {
    return (
      <div>
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className={cn("text-2xl font-semibold tracking-tight tabular-nums", valueColor)}>
          {value}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative rounded-lg border p-3 transition-all hover:-translate-y-0.5 hover:shadow-md",
        TONE_STYLES[tone].border,
      )}
    >
      <Link href={href} aria-label={label} className="absolute inset-0" />
      <div className="pointer-events-none relative z-10">
        <div className={cn("flex items-center gap-1.5", hint && "pointer-events-auto")}>
          <p className="text-muted-foreground text-sm">{label}</p>
          {hint}
        </div>
        <p className={cn("text-2xl font-semibold tracking-tight tabular-nums", valueColor)}>
          {value}
        </p>
      </div>
    </div>
  );
}
