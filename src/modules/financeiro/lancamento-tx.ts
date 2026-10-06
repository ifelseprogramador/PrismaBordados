import type { Database } from "@/core/db";
import { financeiroLancamentos } from "./schema";
import type { LancamentoInput } from "./validation";

export interface LancamentoTxInput extends LancamentoInput {
  referenceType?: "pedido" | "manual";
  referenceId?: string;
  /** Ver `schema.ts#financeiroLancamentos.idempotencyKey`. */
  idempotencyKey?: string;
}

/**
 * Insere um lançamento DENTRO de uma transação já aberta — para a
 * orquestração pedidos↔financeiro gravar o adiantamento e o lançamento no
 * mesmo commit. Devolve `null` quando a `idempotencyKey` já existe (o mesmo
 * formulário reenviado): quem chama deve desfazer o que fez antes na
 * transação (lançar um erro) em vez de duplicar.
 */
export async function inserirLancamento(
  tx: Database,
  organizationId: string,
  data: LancamentoTxInput,
): Promise<{ id: string } | null> {
  const [lancamento] = await tx
    .insert(financeiroLancamentos)
    .values({ ...data, organizationId })
    .onConflictDoNothing()
    .returning({ id: financeiroLancamentos.id });
  return lancamento ?? null;
}
