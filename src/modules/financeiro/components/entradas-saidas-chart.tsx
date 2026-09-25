"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCents } from "@/core/money";
import type { MesEntradasSaidas } from "../queries";

/**
 * Entradas x saídas dos últimos meses — único lugar do sistema que usa
 * Recharts (dependência confinada a `modules/financeiro/components`,
 * nunca uma dependência do `core` — ver docs/decisoes.md, "Recharts só
 * em `modules/financeiro`"). Paleta e escolhas seguem a skill de dataviz
 * consultada antes de escrever este componente:
 *   - Verde (`#008300`) para entrada, vermelho (`#e34948`/`#e66767`
 *     claro/escuro) para saída — par validado com
 *     `scripts/validate_palette.js "#008300,#e34948" --mode light --pairs all`
 *     (só WARN de separação CVD na faixa 6–8, aceitável com codificação
 *     secundária: aqui a legenda e o tooltip ficam sempre visíveis,
 *     nunca só a cor da barra).
 *   - Barras AGRUPADAS, não empilhadas: entrada e saída não somam um
 *     total com sentido (são duas magnitudes independentes por mês) —
 *     empilhar sugeriria uma soma que não existe.
 *   - Um eixo só (nunca dois eixos Y de escalas diferentes).
 *   - Tooltip formata em BRL (mesma `formatCents` usada no resto do
 *     dashboard), eixo Y abreviado.
 *   - Cores via CSS custom properties escopadas a este componente
 *     (`.dark` ancestor, mesma convenção de tema já usada em
 *     `app/globals.css`) — nunca uma dependência de tema nova.
 */
const CHART_COLORS = {
  entrada: { light: "#008300", dark: "#008300" },
  saida: { light: "#e34948", dark: "#e66767" },
};

function formatMonthLabel(mes: string): string {
  const [year, month] = mes.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "short" });
}

function formatAxisValue(valueReais: number): string {
  return formatCents(Math.round(valueReais * 100))
    .replace("R$", "")
    .trim();
}

export function EntradasSaidasChart({ data }: { data: MesEntradasSaidas[] }) {
  const chartData = data.map((d) => ({
    mes: formatMonthLabel(d.mes),
    Entradas: d.entradasCents / 100,
    Saídas: d.saidasCents / 100,
  }));

  return (
    <div className="financeiro-chart h-64 w-full">
      <style>{`
        .financeiro-chart {
          --series-entrada: ${CHART_COLORS.entrada.light};
          --series-saida: ${CHART_COLORS.saida.light};
          --chart-grid: #e1e0d9;
          --chart-ink: #52514e;
        }
        .dark .financeiro-chart {
          --series-entrada: ${CHART_COLORS.entrada.dark};
          --series-saida: ${CHART_COLORS.saida.dark};
          --chart-grid: #2c2c2a;
          --chart-ink: #c3c2b7;
        }
      `}</style>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barGap={4} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="mes"
            stroke="var(--chart-ink)"
            tickLine={false}
            axisLine={{ stroke: "var(--chart-grid)" }}
            fontSize={12}
          />
          <YAxis
            stroke="var(--chart-ink)"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={56}
            tickFormatter={formatAxisValue}
          />
          <Tooltip
            formatter={(value) => formatCents(Math.round(Number(value ?? 0) * 100))}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="Entradas"
            fill="var(--series-entrada)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar dataKey="Saídas" fill="var(--series-saida)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
