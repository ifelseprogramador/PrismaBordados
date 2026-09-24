"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPedido, type InsertResult } from "../actions";

const initialState: InsertResult = { ok: false };

export function PedidoForm({ clientes }: { clientes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createPedido, initialState);
  const errors = state.errors ?? {};

  useEffect(() => {
    if (state.ok && state.id) {
      router.push(`/pedidos/${state.id}?criado=1`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="customerId">Cliente</Label>
        <select
          id="customerId"
          name="customerId"
          required
          className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
        >
          <option value="">Selecione um cliente...</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.name}
            </option>
          ))}
        </select>
        {errors.customerId?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="orderDate">Data do pedido</Label>
        <Input
          id="orderDate"
          name="orderDate"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
        {errors.orderDate?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="deliveryDate">Data de entrega (opcional)</Label>
        <Input id="deliveryDate" name="deliveryDate" type="date" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="deliveryTime">Horário de entrega (opcional)</Label>
        <Input id="deliveryTime" name="deliveryTime" placeholder="ex.: 14:30" />
      </div>

      {state.message && <p className="text-destructive text-sm">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Criar pedido"}
      </Button>
    </form>
  );
}
