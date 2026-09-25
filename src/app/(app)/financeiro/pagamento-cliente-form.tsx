"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCents } from "@/core/money";
import type { ActionResult } from "@/core/action-result";
import type { ClienteComSaldoAReceber } from "@/modules/pedidos";
import { registrarPagamentoCliente } from "./pagamento-cliente-actions";

const initialState: ActionResult = { ok: false };

/**
 * Form de "recebi um pagamento de um cliente" — diferente do lançamento
 * manual genérico (`LancamentoForm`), aqui a lista de clientes já vem
 * filtrada para quem tem saldo em aberto (`clientesDevendo`, calculado
 * pelo módulo `pedidos` na página, nunca importado direto daqui). Ao
 * escolher o cliente, a lista de pedidos em aberto DELE aparece — um
 * cliente pode ter mais de um pedido devendo ao mesmo tempo.
 */
export function PagamentoClienteForm({
  clientesDevendo,
}: {
  clientesDevendo: ClienteComSaldoAReceber[];
}) {
  const [state, formAction, isPending] = useActionState(registrarPagamentoCliente, initialState);
  const errors = state.errors ?? {};
  const today = new Date().toISOString().slice(0, 10);

  const [clienteId, setClienteId] = useState("");
  const pedidosDoCliente = useMemo(
    () => clientesDevendo.find((c) => c.clienteId === clienteId)?.pedidosEmAberto ?? [],
    [clientesDevendo, clienteId],
  );

  if (clientesDevendo.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhum cliente com saldo em aberto no momento.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="clienteId">Cliente</Label>
        <select
          id="clienteId"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
        >
          <option value="">Selecione...</option>
          {clientesDevendo.map((cliente) => (
            <option key={cliente.clienteId} value={cliente.clienteId}>
              {cliente.clienteName} — deve {formatCents(cliente.totalDevidoCents)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="pedidoId">Pedido sendo pago</Label>
        <select
          id="pedidoId"
          name="pedidoId"
          disabled={!clienteId}
          defaultValue=""
          className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm disabled:opacity-50"
        >
          <option value="">{clienteId ? "Selecione..." : "Escolha um cliente primeiro"}</option>
          {pedidosDoCliente.map((pedido) => (
            <option key={pedido.id} value={pedido.id}>
              #{pedido.number} — saldo {formatCents(pedido.saldoCents)}
            </option>
          ))}
        </select>
        {errors.pedidoId?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="valor">Valor pago agora</Label>
        <Input id="valor" name="valor" placeholder="0,00" />
        {errors.valorCents?.map((e) => (
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

      {state.message && <p className="text-destructive col-span-full text-sm">{state.message}</p>}

      <div className="col-span-full">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Registrando..." : "Registrar pagamento"}
        </Button>
      </div>
    </form>
  );
}
