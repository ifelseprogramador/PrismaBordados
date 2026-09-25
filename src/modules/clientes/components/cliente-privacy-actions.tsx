"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/core/action-result";

/**
 * Botões de LGPD (Art. 18) da ficha de cliente: exportar (portabilidade)
 * e excluir/anonimizar (eliminação). Substitui o `ConfirmDeleteButton`
 * genérico nesta página porque a decisão "excluir de verdade vs.
 * anonimizar" (depende de existir pedido associado) e o registro em
 * `lgpd_request_log` vivem na orquestração fora do módulo — ver
 * `app/(app)/clientes/[id]/privacy-actions.ts`. As duas actions chegam
 * como props já vinculadas ao `clienteId`, mesmo padrão de `action` em
 * `adiantamento-form.tsx`.
 */
export function ClientePrivacyActions({
  clienteNome,
  onExport,
  onExclusion,
}: {
  clienteNome: string;
  onExport: () => Promise<{ geradoEm: string; cliente: unknown; pedidos: unknown } | null>;
  onExclusion: () => Promise<ActionResult & { anonymized?: boolean }>;
}) {
  const [open, setOpen] = useState(false);
  const [isExporting, startExport] = useTransition();
  const [isExcluding, startExclusion] = useTransition();
  const router = useRouter();

  function handleExport() {
    startExport(async () => {
      const data = await onExport();
      if (!data) {
        toast.error("Não foi possível gerar a exportação.");
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dados-cliente-${clienteNome.replace(/\s+/g, "-").toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Dados exportados.");
    });
  }

  function handleExclusion() {
    startExclusion(async () => {
      const result = await onExclusion();
      if (result.ok) {
        toast.success(
          result.anonymized
            ? "Dados pessoais anonimizados (o histórico de pedidos foi mantido por obrigação legal)."
            : "Cliente excluído.",
        );
        setOpen(false);
        router.push("/clientes");
      } else {
        toast.error(result.message ?? "Não foi possível concluir a solicitação.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={handleExport} disabled={isExporting}>
        <Download className="h-4 w-4" />
        {isExporting ? "Exportando..." : "Exportar dados (LGPD)"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" />}>
          <ShieldOff className="h-4 w-4" />
          Excluir dados
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir dados do cliente (LGPD)</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir os dados pessoais de &quot;{clienteNome}&quot;? Se não
              houver nenhum pedido associado, o cadastro é removido por completo. Se houver
              histórico de pedidos, o nome/documento/telefone/e-mail/endereço são apagados e
              substituídos por &quot;{"Cliente removido (LGPD)"}&quot; — os pedidos em si são
              mantidos, pois são prova fiscal/contábil com prazo de guarda legal. Essa ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isExcluding}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExclusion} disabled={isExcluding}>
              {isExcluding ? "Processando..." : "Confirmar exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
