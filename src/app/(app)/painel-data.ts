import { canAccessModule } from "@/core/module-access";
import type { getActiveOrg } from "@/core/auth";
import {
  getPedidosDashboardSummary,
  listClientesComSaldoAReceber,
  getPrevisaoRecebimentos,
} from "@/modules/pedidos";
import { listClientes } from "@/modules/clientes/queries";
import {
  getFinanceiroDashboardSummary,
  getEntradasSaidasPorMes,
  getPrevisaoDespesas,
} from "@/modules/financeiro";

/**
 * Dados do painel — FONTE ÚNICA dos dois layouts (formal: `page.tsx`; Fácil:
 * `inicio-facil.tsx`). Toda métrica nova entra AQUI e deve aparecer nos dois
 * layouts, só com apresentação diferente (regra em docs/decisoes.md). Cada
 * bloco só é consultado se a pessoa tem acesso ao módulo (`requireModule()`
 * nas queries lançaria erro).
 */
export async function loadPainelData(org: Awaited<ReturnType<typeof getActiveOrg>>) {
  const temPedidos = canAccessModule(org.moduleAccess, "pedidos");
  const temClientes = canAccessModule(org.moduleAccess, "clientes");
  const temFinanceiro = canAccessModule(org.moduleAccess, "financeiro");

  const [
    pedidosSummary,
    clientes,
    financeiroSummary,
    entradasSaidasPorMes,
    clientesDevendo,
    previsaoRecebimentos,
    previsaoDespesas,
  ] = await Promise.all([
    temPedidos ? getPedidosDashboardSummary() : null,
    temClientes ? listClientes() : null,
    temFinanceiro ? getFinanceiroDashboardSummary() : null,
    temFinanceiro ? getEntradasSaidasPorMes(6) : null,
    temPedidos ? listClientesComSaldoAReceber() : null,
    temPedidos ? getPrevisaoRecebimentos() : null,
    temFinanceiro ? getPrevisaoDespesas() : null,
  ]);

  const totalDevidoGeralCents = (clientesDevendo ?? []).reduce(
    (sum, c) => sum + c.totalDevidoCents,
    0,
  );
  const saldoPrevisto30DiasCents =
    previsaoRecebimentos && previsaoDespesas
      ? previsaoRecebimentos.proximos30DiasCents - previsaoDespesas.proximos30DiasCents
      : 0;

  return {
    temPedidos,
    temClientes,
    temFinanceiro,
    pedidosSummary,
    clientes,
    financeiroSummary,
    entradasSaidasPorMes,
    clientesDevendo,
    previsaoRecebimentos,
    previsaoDespesas,
    totalDevidoGeralCents,
    saldoPrevisto30DiasCents,
  };
}
