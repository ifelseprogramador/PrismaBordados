"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/core/action-result";
import { createLancamento } from "../actions";
import { LANCAMENTO_CATEGORIA_LABELS, LANCAMENTO_CATEGORIAS } from "../validation";

const initialState: ActionResult = { ok: false };

/** Form de lançamento manual — majoritariamente `saida` (compra de
 * material, despesa fixa), mas aceita `entrada` manual também (ex.:
 * venda avulsa sem pedido por trás). Lançamentos de entrada vindos de
 * recebimento de pedido são automáticos (ver
 * `app/(app)/pedidos/[id]/financeiro-actions.ts`), não passam por aqui. */
export function LancamentoForm() {
  const [state, formAction, isPending] = useActionState(createLancamento, initialState);
  const errors = state.errors ?? {};
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="type">Tipo</Label>
        <select
          id="type"
          name="type"
          defaultValue="saida"
          className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
        >
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="categoria">Categoria</Label>
        <select
          id="categoria"
          name="categoria"
          defaultValue="outro"
          className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
        >
          {LANCAMENTO_CATEGORIAS.map((categoria) => (
            <option key={categoria} value={categoria}>
              {LANCAMENTO_CATEGORIA_LABELS[categoria]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="amount">Valor</Label>
        <Input id="amount" name="amount" placeholder="0,00" />
        {errors.amountCents?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="date">Data</Label>
        <Input id="date" name="date" type="date" defaultValue={today} />
        {errors.date?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="col-span-2 flex flex-col gap-1 sm:col-span-4">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Input id="description" name="description" />
      </div>

      {state.message && <p className="text-destructive col-span-full text-sm">{state.message}</p>}

      <div className="col-span-full">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Salvando..." : "Adicionar lançamento"}
        </Button>
      </div>
    </form>
  );
}
