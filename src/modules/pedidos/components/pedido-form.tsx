"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hint } from "@/components/hint";
import { createPedido, type InsertResult } from "../actions";

const initialState: InsertResult = { ok: false };

type BoundAction = (prevState: InsertResult, formData: FormData) => Promise<InsertResult>;

/** `action` é opcional (mesmo padrão de `AdiantamentoForm`): a página
 * (`app/(app)/pedidos/novo/page.tsx`) injeta `criarPedidoComAdiantamento`
 * (orquestração fora do módulo — ver `app/(app)/pedidos/novo/actions.ts`),
 * que também cria o lançamento em `financeiro` quando o pedido nasce com
 * adiantamento. Sem `action`, cai no `createPedido` puro (só grava o
 * pedido, sem lançamento). */
export function PedidoForm({
  clientes,
  action,
}: {
  clientes: { id: string; name: string }[];
  action?: BoundAction;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action ?? createPedido, initialState);
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

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="adiantamento">Adiantamento recebido agora (opcional)</Label>
          <Hint>
            Se o cliente já deu uma entrada ao fechar o pedido, informe o valor aqui — vira um
            lançamento de entrada automático em Financeiro. Deixe em branco se ainda não recebeu
            nada (dá pra registrar depois, na ficha do pedido).
          </Hint>
        </div>
        <Input id="adiantamento" name="adiantamento" placeholder="0,00" />
        {errors.adiantamentoCents?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="paymentDueDate">Vencimento do saldo (opcional)</Label>
        <Input id="paymentDueDate" name="paymentDueDate" type="date" />
      </div>

      {state.message && <p className="text-destructive text-sm">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Criar pedido"}
      </Button>
    </form>
  );
}
