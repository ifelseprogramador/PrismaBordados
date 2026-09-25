"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { emitirNotaFiscalDoPedido } from "./fiscal-actions";

export function EmitirNotaButton({ pedidoId }: { pedidoId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await emitirNotaFiscalDoPedido(pedidoId);
      if (result.ok) {
        toast.success("Emissão processada — confira o status das notas abaixo.");
        router.refresh();
      } else {
        toast.error(result.message ?? "Não foi possível emitir a nota fiscal.");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      <FileText className="h-4 w-4" />
      {isPending ? "Emitindo..." : "Emitir nota fiscal"}
    </Button>
  );
}
