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
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/core/money";
import { formatDate } from "@/core/format";
import { deleteLancamento } from "../actions";
import { LANCAMENTO_CATEGORIA_LABELS } from "../validation";
import type { FinanceiroLancamento } from "../schema.types";

export function LancamentosTable({ lancamentos }: { lancamentos: FinanceiroLancamento[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await deleteLancamento(id);
      if (result.ok) {
        toast.success("Lançamento removido.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Não foi possível remover o lançamento.");
      }
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {lancamentos.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-muted-foreground text-center">
              Nenhum lançamento neste período.
            </TableCell>
          </TableRow>
        )}
        {lancamentos.map((lancamento) => (
          <TableRow key={lancamento.id}>
            <TableCell>{formatDate(lancamento.date)}</TableCell>
            <TableCell>
              <Badge variant={lancamento.type === "entrada" ? "default" : "secondary"}>
                {lancamento.type === "entrada" ? "Entrada" : "Saída"}
              </Badge>
            </TableCell>
            <TableCell>{LANCAMENTO_CATEGORIA_LABELS[lancamento.categoria]}</TableCell>
            <TableCell>{lancamento.description ?? "—"}</TableCell>
            <TableCell className="text-right font-medium">
              {formatCents(lancamento.amountCents)}
            </TableCell>
            <TableCell>
              {lancamento.referenceType !== "pedido" && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending}
                  onClick={() => handleRemove(lancamento.id)}
                  aria-label="Remover lançamento"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
