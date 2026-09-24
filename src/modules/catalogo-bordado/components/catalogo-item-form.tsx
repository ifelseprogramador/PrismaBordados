"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/core/action-result";
import { createCatalogoBordadoItem } from "../actions";

const initialState: ActionResult = { ok: false };

export function CatalogoItemForm() {
  const [state, formAction, isPending] = useActionState(createCatalogoBordadoItem, initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="tipoProduto">Tipo de produto</Label>
        <Input id="tipoProduto" name="tipoProduto" placeholder="ex.: toalha, camiseta" required />
        {errors.tipoProduto?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="modeloPadrao">Modelo padrão (opcional)</Label>
        <Input id="modeloPadrao" name="modeloPadrao" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tamanhosAceitos">Tamanhos aceitos (separados por vírgula)</Label>
        <Input id="tamanhosAceitos" name="tamanhosAceitos" placeholder="P, M, G" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="coresAceitas">Cores aceitas (separadas por vírgula)</Label>
        <Input id="coresAceitas" name="coresAceitas" placeholder="branco, preto" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="defaultPrice">Preço padrão (sugestão)</Label>
        <Input id="defaultPrice" name="defaultPrice" placeholder="0,00" />
      </div>

      {state.message && <p className="text-destructive text-sm">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar item"}
      </Button>
    </form>
  );
}
