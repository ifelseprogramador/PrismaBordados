"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/core/action-result";
import { formatCents } from "@/core/money";
import { registerAdiantamento } from "../actions";

const initialState: ActionResult = { ok: false };

/** Registra o TOTAL agregado de adiantamento recebido (não um lançamento
 * individual — ver comentário em `actions.ts#registerAdiantamento`). */
export function AdiantamentoForm({
  pedidoId,
  adiantamentoCents,
}: {
  pedidoId: string;
  adiantamentoCents: number;
}) {
  const action = registerAdiantamento.bind(null, pedidoId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex items-end gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="adiantamento">Adiantamento recebido (total)</Label>
        <Input
          id="adiantamento"
          name="adiantamento"
          placeholder="0,00"
          defaultValue={(adiantamentoCents / 100).toFixed(2).replace(".", ",")}
        />
        {errors.adiantamentoCents?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Salvando..." : "Atualizar"}
      </Button>
      {state.message && <p className="text-destructive text-sm">{state.message}</p>}
      <p className="text-muted-foreground text-xs">Já recebido: {formatCents(adiantamentoCents)}</p>
    </form>
  );
}
