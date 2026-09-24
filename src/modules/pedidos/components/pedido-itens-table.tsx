"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/core/money";
import { removePedidoItem } from "../actions";
import type { PedidoItem } from "../schema.types";

export function PedidoItensTable({ pedidoId, itens }: { pedidoId: string; itens: PedidoItem[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRemove(itemId: string) {
    startTransition(async () => {
      const result = await removePedidoItem(itemId, pedidoId);
      if (result.ok) {
        toast.success("Item removido.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Não foi possível remover o item.");
      }
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Produto</TableHead>
          <TableHead>Modelo</TableHead>
          <TableHead>Tamanho</TableHead>
          <TableHead>Cor</TableHead>
          <TableHead>Qtd.</TableHead>
          <TableHead>Valor unit.</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="print:hidden" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {itens.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-muted-foreground text-center">
              Nenhum item adicionado ainda.
            </TableCell>
          </TableRow>
        )}
        {itens.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.produto}</TableCell>
            <TableCell>{item.modelo ?? "—"}</TableCell>
            <TableCell>{item.tamanho ?? "—"}</TableCell>
            <TableCell>{item.cor ?? "—"}</TableCell>
            <TableCell>{item.quantity}</TableCell>
            <TableCell>{formatCents(item.unitPriceCents)}</TableCell>
            <TableCell className="text-right">{formatCents(item.totalCents ?? 0)}</TableCell>
            <TableCell className="print:hidden">
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                onClick={() => handleRemove(item.id)}
                aria-label="Remover item"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
