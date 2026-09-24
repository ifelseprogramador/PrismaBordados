"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/core/action-result";
import type { CatalogoBordadoItem } from "@/modules/catalogo-bordado";
import { addPedidoItem } from "../actions";

const initialState: ActionResult = { ok: false };

/** Form de item de pedido. `catalogoItens` (do barrel de `catalogo-bordado`)
 * só serve para o autocomplete opcional — o cliente pode digitar tudo à
 * mão (produto trazido por ele, sem item de catálogo correspondente). */
export function PedidoItemForm({
  pedidoId,
  catalogoItens,
}: {
  pedidoId: string;
  catalogoItens: Pick<
    CatalogoBordadoItem,
    "id" | "tipoProduto" | "modeloPadrao" | "defaultPriceCents"
  >[];
}) {
  const action = addPedidoItem.bind(null, pedidoId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
        <Label htmlFor="catalogoItemId">Item de catálogo (opcional)</Label>
        <select
          id="catalogoItemId"
          name="catalogoItemId"
          className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
        >
          <option value="">Produto avulso / trazido pelo cliente</option>
          {catalogoItens.map((item) => (
            <option key={item.id} value={item.id}>
              {item.tipoProduto}
              {item.modeloPadrao ? ` — ${item.modeloPadrao}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="produto">Produto</Label>
        <Input id="produto" name="produto" required />
        {errors.produto?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="modelo">Modelo</Label>
        <Input id="modelo" name="modelo" />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="tamanho">Tamanho</Label>
        <Input id="tamanho" name="tamanho" />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="cor">Cor</Label>
        <Input id="cor" name="cor" />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="quantity">Quantidade</Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          min="0.01"
          step="0.01"
          defaultValue="1"
        />
        {errors.quantity?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="unitPrice">Valor unitário</Label>
        <Input id="unitPrice" name="unitPrice" placeholder="0,00" />
        {errors.unitPriceCents?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      {state.message && <p className="text-destructive col-span-full text-sm">{state.message}</p>}

      <div className="col-span-full">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Adicionando..." : "Adicionar item"}
        </Button>
      </div>
    </form>
  );
}
