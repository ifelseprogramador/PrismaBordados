"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hint } from "@/components/hint";
import type { ActionResult } from "@/core/action-result";
import { formatCents } from "@/core/money";
import { registerAdiantamento } from "../actions";

const initialState: ActionResult = { ok: false };

type BoundAction = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;

/** Registra o TOTAL agregado de adiantamento recebido (não um lançamento
 * individual — ver comentário em `actions.ts#registerAdiantamento`).
 * `action` é opcional: a página (`app/(app)/pedidos/[id]/page.tsx`) passa
 * a orquestração `registrarRecebimentoPedido` (que também cria o
 * lançamento automático em `financeiro`, ver
 * `app/(app)/pedidos/[id]/financeiro-actions.ts`) — este componente nunca
 * importa `financeiro` diretamente, pra `pedidos` continuar sem depender
 * de outro módulo. Sem `action`, cai no `registerAdiantamento` puro do
 * próprio módulo (só grava o agregado, sem lançamento financeiro).
 *
 * IMPORTANTE pra quem renderiza este componente: passe uma `key` que
 * mude quando o pedido for salvo (ex.: `key={pedido.updatedAt.toString()}`,
 * mesmo padrão de `ClienteForm`) — sem isso, um `defaultValue` (campo não
 * controlado) que muda só via prop, sem remount, dispara o aviso do Base
 * UI "changing the default value state of an uncontrolled FieldControl
 * after being initialized". Isso é diferente de resetar em erro de
 * validação (nunca fazer isso, ver memória do usuário sobre preservar
 * dado válido em formulário) — aqui é o oposto: depois de um SALVAMENTO
 * bem-sucedido, os campos devem refletir o valor que o servidor
 * confirmou, então o remount é o comportamento certo. */
export function AdiantamentoForm({
  pedidoId,
  adiantamentoCents,
  paymentDueDate,
  action,
}: {
  pedidoId: string;
  adiantamentoCents: number;
  /** Vencimento atual do saldo, se já definido (`YYYY-MM-DD`, formato de
   * `<input type="date">`) — editável junto do adiantamento, ver
   * `schema.ts#paymentDueDate`. */
  paymentDueDate?: string | null;
  action?: BoundAction;
}) {
  const boundAction = action ?? registerAdiantamento.bind(null, pedidoId);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="adiantamento">Adiantamento recebido (total)</Label>
          <Hint>
            Digite o TOTAL já recebido até agora, não o valor de um novo pagamento. Ex.: se o
            cliente já pagou R$ 50 e agora está pagando mais R$ 30, digite R$ 80 (não R$ 30). O
            saldo a receber é sempre recalculado como total do pedido menos este valor.
          </Hint>
        </div>
        <Input
          id="adiantamento"
          name="adiantamento"
          placeholder="0,00"
          defaultValue={(adiantamentoCents / 100).toFixed(2).replace(".", ",")}
        />
        {errors.adiantamentoCents?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="paymentDueDate">Vencimento do saldo</Label>
          <Hint>
            Até quando o restante precisa ser pago — aparece no painel na lista de clientes com
            saldo em aberto, marcado como atrasado se essa data passar sem o saldo zerar. Deixe em
            branco se ainda não houver uma data combinada.
          </Hint>
        </div>
        <Input
          id="paymentDueDate"
          name="paymentDueDate"
          type="date"
          defaultValue={paymentDueDate ?? ""}
        />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Salvando..." : "Atualizar"}
      </Button>
      {state.message && <p className="text-destructive text-sm">{state.message}</p>}
      <p className="text-muted-foreground text-xs">Já recebido: {formatCents(adiantamentoCents)}</p>
    </form>
  );
}
