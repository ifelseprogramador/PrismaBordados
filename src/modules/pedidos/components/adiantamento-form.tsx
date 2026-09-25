"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/core/action-result";
import { formatCents } from "@/core/money";
import { registerAdiantamento } from "../actions";

const initialState: ActionResult = { ok: false };

type BoundAction = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;

/** Registra o TOTAL agregado de adiantamento recebido (não um lançamento
 * individual — ver comentário em `actions.ts#registerAdiantamento`).
 * `action` é opcional: a página (`app/(app)/pedidos/[id]/page.tsx`) passa
 * a orquestração `registrarRecebimentoPedido` (que também cria o
 * lançamento automático em `financeiro`, ver
 * `app/(app)/pedidos/[id]/financeiro-actions.ts`) — este componente nunca
 * importa `financeiro` diretamente, pra `pedidos` continuar sem depender
 * de outro módulo. Sem `action`, cai no `registerAdiantamento` puro do
 * próprio módulo (só grava o agregado, sem lançamento financeiro). */
export function AdiantamentoForm({
  pedidoId,
  adiantamentoCents,
  action,
}: {
  pedidoId: string;
  adiantamentoCents: number;
  action?: BoundAction;
}) {
  const boundAction = action ?? registerAdiantamento.bind(null, pedidoId);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);
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
