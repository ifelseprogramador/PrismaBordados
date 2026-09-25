"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hint } from "@/components/hint";
import { formatCents } from "@/core/money";
import type { ActionResult } from "@/core/action-result";
import { createCatalogoBordadoItem, type InsertResult } from "../actions";
import type { CatalogoBordadoItem } from "../schema.types";

const initialState: InsertResult = { ok: false };

/** Form de criação/edição de item de catálogo — mesmo padrão de
 * `ClienteForm` (useActionState + ActionResult, `action` injetável, navega
 * para a ficha do item recém-criado em vez de ficar preso em `/novo`). */
export function CatalogoItemForm({
  item,
  action = createCatalogoBordadoItem,
}: {
  item?: CatalogoBordadoItem;
  action?: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    action as (prevState: InsertResult, formData: FormData) => Promise<InsertResult>,
    initialState,
  );
  const errors = state.errors ?? {};

  useEffect(() => {
    if (!state.ok) return;
    if (!item && state.id) {
      router.push(`/catalogo-bordado/${state.id}`);
      return;
    }
    toast.success("Item de catálogo salvo.");
  }, [state, item, router]);

  return (
    <form key={item?.updatedAt?.toString()} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="tipoProduto">Tipo de produto</Label>
        <Input
          id="tipoProduto"
          name="tipoProduto"
          placeholder="ex.: toalha, camiseta"
          defaultValue={item?.tipoProduto}
          required
        />
        {errors.tipoProduto?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="modeloPadrao">Modelo padrão (opcional)</Label>
        <Input id="modeloPadrao" name="modeloPadrao" defaultValue={item?.modeloPadrao ?? ""} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tamanhosAceitos">Tamanhos aceitos (separados por vírgula)</Label>
        <Input
          id="tamanhosAceitos"
          name="tamanhosAceitos"
          placeholder="P, M, G"
          defaultValue={item?.tamanhosAceitos.join(", ") ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="coresAceitas">Cores aceitas (separadas por vírgula)</Label>
        <Input
          id="coresAceitas"
          name="coresAceitas"
          placeholder="branco, preto"
          defaultValue={item?.coresAceitas.join(", ") ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="defaultPrice">Preço padrão (sugestão)</Label>
          <Hint>
            Só pré-preenche o valor unitário quando este item é escolhido num pedido — o valor final
            de cada pedido continua editável ali, já que o preço real do bordado costuma variar por
            complexidade mesmo dentro do mesmo tipo de produto.
          </Hint>
        </div>
        <Input
          id="defaultPrice"
          name="defaultPrice"
          placeholder="0,00"
          defaultValue={item ? formatCents(item.defaultPriceCents).replace("R$", "").trim() : ""}
        />
      </div>

      {state.message && <p className="text-destructive text-sm">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar item"}
      </Button>
    </form>
  );
}
