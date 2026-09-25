"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import type { ActionResult } from "@/core/action-result";
import { financeiroLancamentos } from "./schema";
import { parseLancamentoFormData, type LancamentoInput } from "./validation";

export interface InsertResult extends ActionResult {
  id?: string;
}

export interface LancamentoRecordInput extends LancamentoInput {
  referenceType?: "pedido" | "manual";
  referenceId?: string;
}

/**
 * Cria um lançamento a partir de dados já validados (não de `FormData`).
 * Duas origens legítimas: `createLancamento` (form manual, abaixo) e a
 * Server Action de orquestração fina em
 * `app/(app)/pedidos/[id]/financeiro-actions.ts`, que gera um lançamento
 * de `entrada` automaticamente quando um pedido registra
 * adiantamento/saldo (ver docs/decisoes.md, "orquestração
 * pedidos↔financeiro") — `financeiro` nunca importa `pedidos` nem
 * vice-versa, então essa orquestração roda FORA dos dois módulos.
 */
export async function createLancamentoRecord(data: LancamentoRecordInput): Promise<InsertResult> {
  const { organizationId, log, withDb } = await withOrg();
  log.info("financeiro.lancamento.criar", { type: data.type, categoria: data.categoria });

  const [lancamento] = await withDb((tx) =>
    tx
      .insert(financeiroLancamentos)
      .values({ ...data, organizationId })
      .returning({ id: financeiroLancamentos.id }),
  );

  log.info("financeiro.lancamento.criar.sucesso", { id: lancamento.id });
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { ok: true, id: lancamento.id };
}

/** Lançamento manual, criado pelo form em `/financeiro` — majoritariamente
 * `saida` (compra de material, despesa fixa), mas aceita `entrada`
 * manual também (ex.: venda avulsa sem pedido por trás). */
export async function createLancamento(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { log } = await withOrg();
  const parsed = parseLancamentoFormData(formData);
  if (!parsed.success) {
    log.warn("financeiro.lancamento.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  return createLancamentoRecord({ ...parsed.data, referenceType: "manual" });
}

export async function deleteLancamento(lancamentoId: string): Promise<ActionResult> {
  const { organizationId, log, withDb } = await withOrg();

  const result = await withDb((tx) =>
    tx
      .delete(financeiroLancamentos)
      .where(
        and(
          eq(financeiroLancamentos.id, lancamentoId),
          eq(financeiroLancamentos.organizationId, organizationId),
        ),
      )
      .returning({ id: financeiroLancamentos.id }),
  );

  if (result.length === 0) {
    log.warn("financeiro.lancamento.remover.nao_encontrado", { lancamentoId });
    return { ok: false, message: "Lançamento não encontrado." };
  }

  log.info("financeiro.lancamento.remover.sucesso", { lancamentoId });
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { ok: true };
}
