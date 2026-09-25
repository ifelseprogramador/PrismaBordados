"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hint } from "@/components/hint";
import type { ActionResult } from "@/core/action-result";
import { createCliente, type InsertResult } from "../actions";
import type { Cliente } from "../schema.types";

const initialState: InsertResult = { ok: false };

/** Form de criação/edição de cliente — mesmo padrão de `CustomerForm` do
 * mecano-erp (useActionState + ActionResult, `action` injetável para
 * reaproveitar entre criar e editar). Sem `cliente`/`action`, usa
 * `createCliente` e navega para a ficha do cliente recém-criado (mesmo
 * padrão de `PedidoForm` — antes disso o usuário criava um cliente e
 * ficava preso em `/clientes/novo`, sem link nenhum para editar/excluir).
 * Com `cliente` + `action` (bind de `updateCliente` com o id), edita — ver
 * `app/(app)/clientes/[id]/page.tsx`. */
export function ClienteForm({
  cliente,
  action = createCliente,
}: {
  cliente?: Cliente;
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
    if (!cliente && state.id) {
      // Criação: navega para a ficha do cliente recém-criado.
      router.push(`/clientes/${state.id}`);
      return;
    }
    // Edição: fica na mesma página, só confirma visualmente.
    toast.success("Cliente salvo.");
  }, [state, cliente, router]);

  return (
    // A key muda quando o registro é salvo (novo `updatedAt` do servidor)
    // — força o React a remontar os campos não controlados com os dados
    // frescos, mesmo padrão do mecano-erp (evita reaproveitar a instância
    // antiga com um defaultValue novo).
    <form key={cliente?.updatedAt?.toString()} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={cliente?.name} required />
        {errors.name?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="document">CPF/CNPJ (opcional)</Label>
          <Hint>
            Aceita CPF (pessoa física) ou CNPJ (pessoa jurídica), com ou sem pontuação. A validação
            confere os dígitos verificadores de verdade, não só a quantidade de números — um CPF
            inventado (ex.: 123.456.789-01) é recusado mesmo com o formato certo.
          </Hint>
        </div>
        <Input id="document" name="document" defaultValue={cliente?.document ?? ""} />
        {errors.document?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" name="phone" defaultValue={cliente?.phone} required />
        {errors.phone?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Endereço (opcional)</Label>
        <Input id="address" name="address" defaultValue={cliente?.address ?? ""} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail (opcional)</Label>
        <Input id="email" name="email" type="email" defaultValue={cliente?.email ?? ""} />
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
