"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { transitionPedidoStatus } from "../actions";
import { isValidTransition, type PedidoStatus } from "../domain";
import { PEDIDO_STATUS_LABELS } from "./pedido-status-badge";

const NEXT_STEPS: Partial<Record<PedidoStatus, PedidoStatus>> = {
  orcamento: "aprovado",
  aprovado: "em_producao",
  em_producao: "pronto",
  pronto: "entregue",
};

/** Botões de transição de status — só oferece o "próximo passo" do fluxo
 * feliz + "cancelar" (ambos validados de novo no servidor via
 * `isValidTransition`, ver `domain.ts`; a UI só evita oferecer um botão
 * que o servidor recusaria). */
export function PedidoStatusActions({
  pedidoId,
  status,
}: {
  pedidoId: string;
  status: PedidoStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleTransition(next: PedidoStatus) {
    startTransition(async () => {
      const result = await transitionPedidoStatus(pedidoId, next);
      if (result.ok) {
        toast.success(`Pedido movido para "${PEDIDO_STATUS_LABELS[next]}".`);
        router.refresh();
      } else {
        toast.error(result.message ?? "Não foi possível mudar o status.");
      }
    });
  }

  const nextStep = NEXT_STEPS[status];
  const canCancel = isValidTransition(status, "cancelado");

  return (
    <div className="flex flex-wrap gap-2">
      {nextStep && (
        <Button size="sm" disabled={isPending} onClick={() => handleTransition(nextStep)}>
          {isPending ? "Movendo..." : `Mover para "${PEDIDO_STATUS_LABELS[nextStep]}"`}
        </Button>
      )}
      {canCancel && (
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() => handleTransition("cancelado")}
        >
          Cancelar pedido
        </Button>
      )}
    </div>
  );
}
