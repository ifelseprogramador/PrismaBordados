"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hint } from "@/components/hint";
import type { ActionResult } from "@/core/action-result";
import type { CatalogoBordadoItem } from "@/modules/catalogo-bordado";
import { addPedidoItem } from "../actions";

const initialState: ActionResult = { ok: false };

type CatalogoItemOption = Pick<
  CatalogoBordadoItem,
  "id" | "tipoProduto" | "modeloPadrao" | "defaultPriceCents"
>;

/** Form de item de pedido. `catalogoItens` (do barrel de `catalogo-bordado`)
 * alimenta o select "Item de catálogo": ao escolher um, pré-preenche
 * Produto/Modelo/Valor unitário com os dados do catálogo (o cliente ainda
 * pode editar cada campo antes de adicionar — é só um ponto de partida,
 * não trava nada). Sem selecionar nada ("Produto avulso..."), o cliente
 * digita tudo à mão (produto trazido por ele, sem item de catálogo
 * correspondente). */
export function PedidoItemForm({
  pedidoId,
  catalogoItens,
}: {
  pedidoId: string;
  catalogoItens: CatalogoItemOption[];
}) {
  const action = addPedidoItem.bind(null, pedidoId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const errors = state.errors ?? {};

  const produtoRef = useRef<HTMLInputElement>(null);
  const modeloRef = useRef<HTMLInputElement>(null);
  const unitPriceRef = useRef<HTMLInputElement>(null);

  function handleCatalogoChange(itemId: string) {
    const item = catalogoItens.find((i) => i.id === itemId);
    if (!item) return; // "Produto avulso..." — não mexe no que já foi digitado.
    if (produtoRef.current) produtoRef.current.value = item.tipoProduto;
    if (modeloRef.current) modeloRef.current.value = item.modeloPadrao ?? "";
    if (unitPriceRef.current) {
      unitPriceRef.current.value = (item.defaultPriceCents / 100).toFixed(2).replace(".", ",");
    }
  }

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="catalogoItemId">Item de catálogo (opcional)</Label>
          <Hint>
            Escolher um item aqui pré-preenche Produto, Modelo e Valor unitário com os dados
            cadastrados no catálogo — você ainda pode editar qualquer campo antes de adicionar.
          </Hint>
        </div>
        <select
          id="catalogoItemId"
          name="catalogoItemId"
          className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
          onChange={(e) => handleCatalogoChange(e.target.value)}
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
        <Input id="produto" name="produto" ref={produtoRef} required />
        {errors.produto?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="modelo">Modelo</Label>
        <Input id="modelo" name="modelo" ref={modeloRef} />
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
        <Input id="unitPrice" name="unitPrice" placeholder="0,00" ref={unitPriceRef} />
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
