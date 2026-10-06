"use server";

/**
 * Orquestração fina pedidos↔financeiro (ver docs/decisoes.md,
 * "orquestração pedidos↔financeiro: onde ficou"). Nenhum dos dois
 * módulos pode importar o outro (regra de acoplamento em
 * `src/modules/README.md`) — este arquivo vive FORA de ambos, em
 * `app/(app)/pedidos/[id]/`, e é o único lugar que conhece os dois
 * barrels ao mesmo tempo: chama `pedidos` para registrar o recebimento
 * (valor agregado) e `financeiro` para criar o lançamento de `entrada`
 * correspondente (valor do recebimento em si, não o agregado).
 */
import { revalidatePath } from "next/cache";
import { ModuleAccessDeniedError, requireModule } from "@/core/auth";
import type { ActionResult } from "@/core/action-result";
import { aplicarAdiantamento, getPedidoById, parseAdiantamentoFormData } from "@/modules/pedidos";
import { inserirLancamento } from "@/modules/financeiro";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

const CONFLICT_MESSAGE =
  "Este pedido foi alterado por outra pessoa enquanto você editava. Atualize a página e tente de novo.";

/**
 * Registra um recebimento (adiantamento ou saldo) de um pedido: grava o novo
 * TOTAL agregado recebido e, se ele realmente cresceu, cria o lançamento de
 * `entrada` em `financeiro` no valor exato da DIFERENÇA (o recebimento desta
 * vez, não o agregado) — categoria `saldo_recebido` quando este recebimento
 * zera o saldo do pedido, `adiantamento` caso contrário.
 *
 * As duas gravações acontecem na MESMA transação (e com a linha do pedido
 * travada): ou as duas valem ou nenhuma, e duas pessoas registrando ao mesmo
 * tempo nunca geram lançamento em duplicidade nem se sobrescrevem — a versão
 * do pedido que o formulário viu (`headerVersion`) precisa ser a gravada.
 * Exige acesso a Pedidos E a Financeiro.
 */
export async function registrarRecebimentoPedido(
  pedidoId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const pedidosCtx = await requireModule("pedidos");
  const financeiroCtx = await requireModule("financeiro").catch((err) =>
    err instanceof ModuleAccessDeniedError ? null : Promise.reject(err),
  );
  if (!financeiroCtx) {
    return {
      ok: false,
      message:
        "Registrar recebimento exige acesso ao Financeiro. Fale com o responsável pela conta.",
    };
  }

  const parsed = parseAdiantamentoFormData(formData);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const rawVersion = formData.get("headerVersion");
  const expectedVersion =
    rawVersion === null || rawVersion === "" ? Number.NaN : Number(rawVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    return { ok: false, message: "Não foi possível salvar. Atualize a página e tente de novo." };
  }

  const pedidoInfo = await getPedidoById(pedidoId);
  if (!pedidoInfo) {
    return { ok: false, message: "Pedido não encontrado." };
  }

  const { organizationId, log, withDb } = pedidosCtx;
  log.info("pedidos.recebimento.registrar", { pedidoId });

  const result = await withDb(async (tx) => {
    const aplicado = await aplicarAdiantamento(tx, {
      organizationId,
      pedidoId,
      adiantamentoCents: parsed.data.adiantamentoCents,
      paymentDueDate: parsed.data.paymentDueDate ?? null,
      expectedVersion,
    });
    if (aplicado.kind !== "ok") return aplicado;

    const recebidoAgoraCents = aplicado.afterCents - aplicado.beforeCents;
    if (recebidoAgoraCents > 0) {
      const categoria = (aplicado.saldoCents ?? 0) <= 0 ? "saldo_recebido" : "adiantamento";
      await inserirLancamento(tx, organizationId, {
        type: "entrada",
        categoria,
        amountCents: recebidoAgoraCents,
        date: todayDateString(),
        description: `Recebimento do pedido #${aplicado.number} — ${pedidoInfo.customerName}`,
        referenceType: "pedido",
        referenceId: pedidoId,
      });
    }
    return aplicado;
  });

  if (result.kind === "not_found") return { ok: false, message: "Pedido não encontrado." };
  if (result.kind === "conflict") return { ok: false, message: CONFLICT_MESSAGE };

  log.info("pedidos.recebimento.sucesso", { pedidoId });
  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { ok: true };
}
