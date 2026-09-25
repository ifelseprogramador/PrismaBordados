import "server-only";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
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
}

export async function listLancamentos(options?: ListLancamentosOptions) {
  const { organizationId, withDb } = await withOrg();
  const conditions = [eq(financeiroLancamentos.organizationId, organizationId)];

  if (options?.month) {
    const [year, month] = options.month.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    conditions.push(gte(financeiroLancamentos.date, toDateString(start)));
    conditions.push(lt(financeiroLancamentos.date, toDateString(end)));
  }
  if (options?.type) {
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
