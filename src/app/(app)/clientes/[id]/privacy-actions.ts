"use server";

/**
 * Orquestração fina clientes↔pedidos para os direitos do titular (LGPD,
 * Art. 18) — mesmo padrão de `app/(app)/pedidos/[id]/financeiro-actions.ts`:
 * nenhum dos dois módulos pode importar o outro (regra 8 de
 * `src/modules/README.md`), então este arquivo vive FORA de ambos e é o
 * único lugar que conhece os dois barrels ao mesmo tempo. Ver
 * docs/lgpd-checklist.md.
 */
import { revalidatePath } from "next/cache";
import { withOrg } from "@/core/auth";
import { recordLgpdAction } from "@/core/audit-log";
import type { ActionResult } from "@/core/action-result";
import { getClienteById, deleteCliente, anonymizeCliente } from "@/modules/clientes";
import { listPedidosByClienteId } from "@/modules/pedidos";

export interface SolicitarExclusaoResult extends ActionResult {
  /** true = anonimizado (histórico de pedidos preservado por obrigação
   * legal, Art. 16 da LGPD); false = excluído de verdade (nenhum pedido). */
  anonymized?: boolean;
}

/**
 * Direito à eliminação. Decide, ANTES de chamar o módulo `clientes`, se
 * dá para excluir de verdade (nenhum pedido referencia o cliente — a FK
 * `pedidos.customerId` é `onDelete: "restrict"`, então uma exclusão com
 * histórico simplesmente falharia no banco) ou se precisa anonimizar
 * (preserva a linha para os pedidos existentes, sobrescreve os campos
 * pessoais). Pedidos/notas fiscais são prova contábil com prazo de guarda
 * legal (Art. 16, II da LGPD permite reter dado além do pedido do titular
 * quando há cumprimento de obrigação legal/regulatória) — nunca são
 * apagados por esta rota.
 */
export async function solicitarExclusaoCliente(
  clienteId: string,
): Promise<SolicitarExclusaoResult> {
  const pedidos = await listPedidosByClienteId(clienteId);

  const result =
    pedidos.length === 0 ? await deleteCliente(clienteId) : await anonymizeCliente(clienteId);

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
  return { ...result, anonymized: pedidos.length > 0 };
}

export interface ExportacaoClienteData {
  geradoEm: string;
  cliente: Awaited<ReturnType<typeof getClienteById>>;
  pedidos: Awaited<ReturnType<typeof listPedidosByClienteId>>;
}

/**
 * Direito à portabilidade (Art. 18, V). Devolve todo dado pessoal
 * conhecido sobre o titular — o próprio cadastro e o resumo dos pedidos
 * associados (não os itens de cada pedido: são dado do PRODUTO, não do
 * titular) — para a UI oferecer como download (`.json`). Registra a
 * operação em `lgpd_request_log` antes de devolver.
 */
export async function exportarDadosCliente(
  clienteId: string,
): Promise<ExportacaoClienteData | null> {
  const { organizationId, userId, withDb } = await withOrg();

  const [cliente, pedidos] = await Promise.all([
    getClienteById(clienteId),
    listPedidosByClienteId(clienteId),
  ]);

  if (!cliente) return null;

  await withDb((tx) =>
    recordLgpdAction(tx, {
      organizationId,
      performedBy: userId,
      action: "export",
      subjectTable: "clientes",
      subjectId: clienteId,
    }),
  );

  return { geradoEm: new Date().toISOString(), cliente, pedidos };
}
