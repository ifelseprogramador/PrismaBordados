"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/core/action-result";
import { createCliente } from "../actions";

const initialState: ActionResult = { ok: false };

/** Form de criação de cliente — mesmo padrão de `NewOrganizationForm`
 * (useActionState + ActionResult), reutilizável em `/clientes/novo` e em
 * qualquer módulo que precise criar um cliente inline (ex. `pedidos`). */
export function ClienteForm() {
  const [state, formAction, isPending] = useActionState(createCliente, initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required />
        {errors.name?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="document">CPF/CNPJ (opcional)</Label>
        <Input id="document" name="document" />
        {errors.document?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" name="phone" required />
        {errors.phone?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Endereço (opcional)</Label>
        <Input id="address" name="address" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail (opcional)</Label>
        <Input id="email" name="email" type="email" />
        {errors.email?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      {state.message && <p className="text-destructive text-sm">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar cliente"}
      </Button>
    </form>
  );
}
