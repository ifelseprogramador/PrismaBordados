import { Badge } from "@/components/ui/badge";
import type { PedidoStatus } from "../domain";

export const PEDIDO_STATUS_LABELS: Record<PedidoStatus, string> = {
  orcamento: "Orçamento",
  aprovado: "Aprovado",
  em_producao: "Em produção",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const PEDIDO_STATUS_VARIANT: Record<
  PedidoStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  orcamento: "outline",
  aprovado: "secondary",
  em_producao: "secondary",
  pronto: "default",
  entregue: "default",
  cancelado: "destructive",
};

export function PedidoStatusBadge({ status }: { status: PedidoStatus }) {
  return <Badge variant={PEDIDO_STATUS_VARIANT[status]}>{PEDIDO_STATUS_LABELS[status]}</Badge>;
}
