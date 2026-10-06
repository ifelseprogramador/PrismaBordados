"use server";

/**
 * Orquestração fina pedidos↔financeiro para o caso "recebi um pagamento
 * de um cliente que já tem saldo em aberto" iniciado a partir de
 * `/financeiro` (não da ficha do pedido — ver
 * `app/(app)/pedidos/[id]/financeiro-actions.ts` para o caso simétrico
 * iniciado de lá). Mesma regra de sempre: fora dos dois módulos, nenhum
 * importa o outro.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ModuleAccessDeniedError, requireModule } from "@/core/auth";
import { parseReaisInput } from "@/core/money";
import type { ActionResult } from "@/core/action-result";
import { getPedidoById, somarAdiantamento } from "@/modules/pedidos";
import { inserirLancamento } from "@/modules/financeiro";

const pagamentoClienteSchema = z.object({
  pedidoId: z.uuid("Selecione o pedido que está sendo pago."),
  valorCents: z.coerce.number().int().positive("Informe um valor maior que zero."),
  date: z.string().trim().min(1, "Informe a data."),
  // Gerada no navegador, uma por abertura do formulário (ver
  // `pagamento-cliente-form.tsx`) — impede lançar duas vezes o mesmo envio.
  idempotencyKey: z.string().trim().min(8).max(100),
});

/** Sinaliza "este envio já foi registrado" de dentro da transação, para
 * desfazer o adiantamento somado antes do lançamento duplicado. */
class PagamentoDuplicadoError extends Error {}

/**
 * Recebe `pedidoId` (não `clienteId`) porque um cliente pode ter mais de
 * um pedido em aberto — o form (`pagamento-cliente-form.tsx`) escolhe o
 * cliente só para filtrar a lista de pedidos, mas quem de fato importa
 * aqui é qual PEDIDO está sendo pago. `valorCents` é o quanto está sendo
 * pago AGORA (delta), não o novo total agregado.
 *
 * Soma ao adiantamento e cria o lançamento na MESMA transação — antes eram
 * duas transações, e uma falha no meio deixava o pedido pago sem lançamento
 * (ou o inverso). A `idempotencyKey` do formulário torna duplo clique, duas
 * abas e retry seguros: o segundo envio vira "já registrado", sem somar de
 * novo. Exige acesso a Pedidos E a Financeiro.
 */
export async function registrarPagamentoCliente(
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
      message: "Registrar pagamento exige acesso ao Financeiro. Fale com o responsável pela conta.",
    };
  }

  const valorCents = parseReaisInput(String(formData.get("valor") ?? ""));
  const parsed = pagamentoClienteSchema.safeParse({
    pedidoId: formData.get("pedidoId"),
    valorCents: valorCents ?? undefined,
    date: formData.get("date"),
    idempotencyKey: formData.get("idempotencyKey"),
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const pedidoAntes = await getPedidoById(parsed.data.pedidoId);
  if (!pedidoAntes) {
    return { ok: false, message: "Pedido não encontrado." };
  }

  const { organizationId, log, withDb } = pedidosCtx;
  log.info("financeiro.pagamento_cliente.registrar", { pedidoId: parsed.data.pedidoId });

  try {
    const outcome = await withDb(async (tx) => {
      const pedido = await somarAdiantamento(tx, {
        organizationId,
        pedidoId: parsed.data.pedidoId,
        valorCents: parsed.data.valorCents,
      });
      if (!pedido) return "not_found" as const;

      const categoria = (pedido.saldoCents ?? 0) <= 0 ? "saldo_recebido" : "adiantamento";
      const lancamento = await inserirLancamento(tx, organizationId, {
        type: "entrada",
        categoria,
        amountCents: parsed.data.valorCents,
        date: parsed.data.date,
        description: `Pagamento recebido do pedido #${pedidoAntes.number} — ${pedidoAntes.customerName}`,
        referenceType: "pedido",
        referenceId: parsed.data.pedidoId,
        idempotencyKey: parsed.data.idempotencyKey,
      });
      // Chave repetida: desfaz a soma feita acima (lançar = rollback).
      if (!lancamento) throw new PagamentoDuplicadoError();
      return "ok" as const;
    });

    if (outcome === "not_found") return { ok: false, message: "Pedido não encontrado." };
  } catch (err) {
    if (err instanceof PagamentoDuplicadoError) {
      log.warn("financeiro.pagamento_cliente.duplicado", { pedidoId: parsed.data.pedidoId });
      return { ok: true, message: "Este pagamento já tinha sido registrado." };
    }
    // Dois envios simultâneos com a mesma chave: o segundo estoura a
    // restrição de unicidade ao inserir — mesma conclusão, nada foi somado.
    if (
      /financeiro_lancamentos_org_idempotency_unique/.test(
        String(err instanceof Error ? `${err.message} ${err.cause}` : err),
      )
    ) {
      return { ok: true, message: "Este pagamento já tinha sido registrado." };
    }
    throw err;
  }

  revalidatePath("/financeiro");
  revalidatePath("/");
  revalidatePath(`/pedidos/${parsed.data.pedidoId}`);
  return { ok: true };
}
