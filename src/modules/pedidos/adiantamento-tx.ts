import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/core/db";
import { pedidos } from "./schema";

/**
 * Operações de adiantamento que rodam DENTRO de uma transação já aberta
 * (`tx`), para a orquestração pedidos↔financeiro gravar o adiantamento e o
 * lançamento no MESMO commit (`app/(app)/financeiro/pagamento-cliente-actions.ts`,
 * `app/(app)/pedidos/[id]/financeiro-actions.ts`). Fica fora de `actions.ts`
 * (que é "use server") de propósito: uma Server Action exportada pode ser
 * chamada pelo navegador com argumentos forjados — aqui `tx` nunca deveria
 * vir de fora do servidor.
 */

export type AplicarAdiantamentoResult =
  | { kind: "not_found" }
  | { kind: "conflict" }
  | {
      kind: "ok";
      /** Adiantamento ANTES desta gravação (para calcular o recebido agora). */
      beforeCents: number;
      afterCents: number;
      totalCents: number;
      saldoCents: number | null;
      number: number;
    };

/**
 * Grava o adiantamento TOTAL (valor absoluto, do formulário da ficha).
 * Trava a linha do pedido e confere a versão que a pessoa estava vendo:
 * duas pessoas registrando recebimento ao mesmo tempo não se sobrescrevem
 * em silêncio, e o "recebido agora" (`afterCents - beforeCents`) é sempre
 * calculado contra o valor realmente gravado.
 */
export async function aplicarAdiantamento(
  tx: Database,
  input: {
    organizationId: string;
    pedidoId: string;
    adiantamentoCents: number;
    paymentDueDate: string | null;
    expectedVersion: number;
  },
): Promise<AplicarAdiantamentoResult> {
  const [atual] = await tx
    .select({
      adiantamentoCents: pedidos.adiantamentoCents,
      headerVersion: pedidos.headerVersion,
    })
    .from(pedidos)
    .where(and(eq(pedidos.id, input.pedidoId), eq(pedidos.organizationId, input.organizationId)))
    .limit(1)
    .for("update");
  if (!atual) return { kind: "not_found" };
  if (atual.headerVersion !== input.expectedVersion) return { kind: "conflict" };

  const [depois] = await tx
    .update(pedidos)
    .set({
      adiantamentoCents: input.adiantamentoCents,
      paymentDueDate: input.paymentDueDate,
      headerVersion: sql`${pedidos.headerVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(pedidos.id, input.pedidoId))
    .returning({
      adiantamentoCents: pedidos.adiantamentoCents,
      totalCents: pedidos.totalCents,
      saldoCents: pedidos.saldoCents,
      number: pedidos.number,
    });

  return {
    kind: "ok",
    beforeCents: atual.adiantamentoCents,
    afterCents: depois.adiantamentoCents,
    totalCents: depois.totalCents,
    saldoCents: depois.saldoCents,
    number: depois.number,
  };
}

/** Soma `valorCents` ao adiantamento (DELTA), atômico no SQL, e sobe a
 * versão (um formulário de adiantamento aberto em outra tela passa a
 * detectar conflito). `null` = pedido não encontrado. */
export async function somarAdiantamento(
  tx: Database,
  input: { organizationId: string; pedidoId: string; valorCents: number },
) {
  const [pedido] = await tx
    .update(pedidos)
    .set({
      adiantamentoCents: sql`${pedidos.adiantamentoCents} + ${input.valorCents}`,
      headerVersion: sql`${pedidos.headerVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(pedidos.id, input.pedidoId), eq(pedidos.organizationId, input.organizationId)))
    .returning({
      id: pedidos.id,
      adiantamentoCents: pedidos.adiantamentoCents,
      saldoCents: pedidos.saldoCents,
      number: pedidos.number,
    });
  return pedido ?? null;
}
