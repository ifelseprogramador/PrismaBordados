import { FileDown, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FiscalNota } from "../schema.types";

const STATUS_LABEL: Record<FiscalNota["status"], string> = {
  pendente: "Pendente",
  emitida: "Emitida",
  erro: "Erro",
  cancelada: "Cancelada",
};

const STATUS_VARIANT: Record<FiscalNota["status"], "default" | "secondary" | "destructive"> = {
  pendente: "secondary",
  emitida: "default",
  erro: "destructive",
  cancelada: "secondary",
};

/** Lista as notas fiscais de um pedido (0, 1 ou 2 — NF-e e/ou NFS-e, ver
 * `domain.ts#splitItensPorOperacao`) com link de download quando existir. */
export function FiscalNotasList({ notas }: { notas: FiscalNota[] }) {
  if (notas.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhuma nota fiscal emitida ainda.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {notas.map((nota) => (
        <li key={nota.id} className="flex items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="text-muted-foreground h-4 w-4" />
            <span className="font-medium uppercase">{nota.tipo}</span>
            <Badge variant={STATUS_VARIANT[nota.status]}>{STATUS_LABEL[nota.status]}</Badge>
            {nota.status === "erro" && nota.errorMessage && (
              <span className="text-destructive text-xs">{nota.errorMessage}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {nota.pdfUrl && (
              <a
                href={nota.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary flex items-center gap-1 text-xs hover:underline"
              >
                <FileDown className="h-3 w-3" /> PDF
              </a>
            )}
            {nota.xmlUrl && (
              <a
                href={nota.xmlUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary flex items-center gap-1 text-xs hover:underline"
              >
                <FileDown className="h-3 w-3" /> XML
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
