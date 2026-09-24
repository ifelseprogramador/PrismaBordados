"use client";

import { useActionState } from "react";
import { CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { restoreBackup, type BackupRestoreState } from "@/core/backup-actions";

const initialState: BackupRestoreState = { status: "idle" };

/**
 * Rótulo amigável por tabela restaurada — cada módulo que chama
 * `registerBackupTable()` (ver `core/backup.ts` e o `module.ts` de cada
 * módulo em `src/modules/`) deve ter uma entrada aqui; sem entrada, cai
 * no nome cru da tabela.
 */
const TABLE_LABELS: Record<string, string> = {
  clientes: "Clientes",
  catalogo_bordado_itens: "Itens de catálogo",
  pedidos: "Pedidos",
};

export function BackupRestoreForm() {
  const [state, formAction, isPending] = useActionState(restoreBackup, initialState);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="file">Arquivo de backup (.json)</Label>
          <Input id="file" name="file" type="file" accept=".json,application/json" required />
        </div>
        {state.status === "error" && <p className="text-destructive text-sm">{state.message}</p>}
        <Button type="submit" variant="outline" disabled={isPending} className="self-start">
          <Upload className="h-4 w-4" />
          {isPending ? "Restaurando..." : "Restaurar backup"}
        </Button>
      </form>

      {state.status === "done" && (
        <div className="flex flex-col gap-2 rounded-lg border p-4 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            Restauração concluída.
          </p>
          <ul className="text-muted-foreground flex flex-col gap-1">
            {state.summary.map((s) => (
              <li key={s.table}>
                {TABLE_LABELS[s.table] ?? s.table}: {s.inserted} nova
                {s.inserted === 1 ? "" : "s"}
                {s.skipped > 0 ? `, ${s.skipped} já existia${s.skipped === 1 ? "" : "m"}` : ""}.
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
