import "server-only";
import { and, desc, eq, gt, gte, lte, lt, sql } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { financeiroLancamentos } from "./schema";
import { calculateLucro } from "./domain";

function monthRange(reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
  return { start: toDateString(start), end: toDateString(end) };
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface ListLancamentosOptions {
  /** "YYYY-MM" — quando omitido, lista tudo. */
  month?: string;
  type?: "entrada" | "saida";
  /** Só saídas já lançadas com `date` no FUTURO (depois de hoje, até 30
   * dias) — mesmo filtro de `getPrevisaoDespesas`, usado pela página
   * `/financeiro?previsao=30dias` (link de "A pagar" na Previsão de
   * caixa do painel, pra mostrar exatamente quais lançamentos compõem
   * aquele número). Ignora `month` se os dois forem passados. */
  futuras?: boolean;
}

export async function listLancamentos(options?: ListLancamentosOptions) {
  const { organizationId, withDb } = await withOrg();
  const conditions = [eq(financeiroLancamentos.organizationId, organizationId)];

  if (options?.futuras) {
    const today = new Date();
    const in30Days = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
    conditions.push(eq(financeiroLancamentos.type, "saida"));
    conditions.push(gt(financeiroLancamentos.date, toDateString(today)));
    conditions.push(lte(financeiroLancamentos.date, toDateString(in30Days)));
  } else if (options?.month) {
    const [year, month] = options.month.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    conditions.push(gte(financeiroLancamentos.date, toDateString(start)));
    conditions.push(lt(financeiroLancamentos.date, toDateString(end)));
  }
  if (options?.type && !options?.futuras) {
    conditions.push(eq(financeiroLancamentos.type, options.type));
  }

  return withDb((tx) =>
    tx
      .select()
      .from(financeiroLancamentos)
      .where(and(...conditions))
      .orderBy(desc(financeiroLancamentos.date), desc(financeiroLancamentos.createdAt)),
  );
}

/**
 * Resumo do mês corrente pro dashboard (`app/(app)/page.tsx`): entradas,
 * saídas, lucro (ver `domain.ts#calculateLucro`). "A receber" é métrica
 * DIFERENTE, calculada pelo módulo `pedidos`
 * (`getPedidosDashboardSummary`) — este módulo nunca soma isso aqui,
 * porque `financeiro` não sabe o que é um "pedido" (ver docs/decisoes.md).
 */
export async function getFinanceiroDashboardSummary() {
  const { organizationId, withDb } = await withOrg();
  const { start, end } = monthRange();

  return withDb(async (tx) => {
    const [row] = await tx
      .select({
        entradasCents: sql<number>`coalesce(sum(case when ${financeiroLancamentos.type} = 'entrada' then ${financeiroLancamentos.amountCents} else 0 end), 0)::int`,
        saidasCents: sql<number>`coalesce(sum(case when ${financeiroLancamentos.type} = 'saida' then ${financeiroLancamentos.amountCents} else 0 end), 0)::int`,
      })
      .from(financeiroLancamentos)
      .where(
        and(
          eq(financeiroLancamentos.organizationId, organizationId),
          gte(financeiroLancamentos.date, start),
          lt(financeiroLancamentos.date, end),
        ),
      );

    const entradasCents = row?.entradasCents ?? 0;
    const saidasCents = row?.saidasCents ?? 0;
    return { entradasCents, saidasCents, lucroCents: calculateLucro(entradasCents, saidasCents) };
  });
}

export interface MesEntradasSaidas {
  mes: string;
  entradasCents: number;
  saidasCents: number;
}

/** Série dos últimos `months` meses (entradas x saídas), do mais antigo
 * pro mais recente — alimenta `components/entradas-saidas-chart.tsx`. */
export async function getEntradasSaidasPorMes(months = 6): Promise<MesEntradasSaidas[]> {
  const { organizationId, withDb } = await withOrg();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const rows = await withDb((tx) =>
    tx
      .select({
        mes: sql<string>`to_char(date_trunc('month', ${financeiroLancamentos.date}), 'YYYY-MM')`,
        entradasCents: sql<number>`coalesce(sum(case when ${financeiroLancamentos.type} = 'entrada' then ${financeiroLancamentos.amountCents} else 0 end), 0)::int`,
        saidasCents: sql<number>`coalesce(sum(case when ${financeiroLancamentos.type} = 'saida' then ${financeiroLancamentos.amountCents} else 0 end), 0)::int`,
      })
      .from(financeiroLancamentos)
      .where(
        and(
          eq(financeiroLancamentos.organizationId, organizationId),
          gte(financeiroLancamentos.date, toDateString(start)),
        ),
      )
      .groupBy(sql`date_trunc('month', ${financeiroLancamentos.date})`)
      .orderBy(sql`date_trunc('month', ${financeiroLancamentos.date})`),
  );

  // Preenche meses sem nenhum lançamento com zero, pro gráfico nunca
  // "pular" um mês (eixo X sempre contínuo).
  const byMonth = new Map(rows.map((r) => [r.mes, r]));
  const result: MesEntradasSaidas[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const found = byMonth.get(key);
    result.push({
      mes: key,
      entradasCents: found?.entradasCents ?? 0,
      saidasCents: found?.saidasCents ?? 0,
    });
  }
  return result;
}

export interface PrevisaoDespesas {
  /** Soma de lançamentos `saida` já registrados com `date` no FUTURO
   * (depois de hoje, até 30 dias) — não é uma despesa recorrente
   * automática nem um "contas a pagar" de verdade, é só o que o usuário
   * já lançou adiantado (ex.: uma despesa fixa do mês que vem digitada
   * hoje). Ver docs/decisoes.md, "previsão de caixa" — limitação
   * documentada ali. */
  proximos30DiasCents: number;
}

/** Base do lado de SAÍDAS da seção "Previsão de caixa" do painel — o
 * lado de entradas vem de `pedidos#getPrevisaoRecebimentos`, composto
 * junto na página (nenhum dos dois módulos importa o outro). */
export async function getPrevisaoDespesas(): Promise<PrevisaoDespesas> {
  const { organizationId, withDb } = await withOrg();

  return withDb(async (tx) => {
    const [row] = await tx
      .select({
        proximos30DiasCents: sql<number>`coalesce(sum(${financeiroLancamentos.amountCents}) filter (
          where ${financeiroLancamentos.type} = 'saida'
            and ${financeiroLancamentos.date} > current_date
            and ${financeiroLancamentos.date} <= current_date + 30
        ), 0)::int`,
      })
      .from(financeiroLancamentos)
      .where(eq(financeiroLancamentos.organizationId, organizationId));

    return { proximos30DiasCents: row?.proximos30DiasCents ?? 0 };
  });
}
