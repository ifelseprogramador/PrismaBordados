"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/core/action-result";
import { saveFiscalCredentials } from "../actions";

const initialState: ActionResult = { ok: false };

export interface FiscalCredentialsSummary {
  providerSlug: string | null;
  cnpj: string | null;
  regimeTributario: string | null;
  serieNota: string | null;
  hasApiKey: boolean;
}

/** Form de configuração fiscal — `providerSlug` fica vazio até a
 * organização contratar um provedor (nenhum provedor real está
 * implementado nesta fase, ver docs/decisoes.md). Nunca pré-preenche
 * `apiKey` (só mostra se já existe uma configurada). */
export function FiscalCredentialsForm({ summary }: { summary: FiscalCredentialsSummary | null }) {
  const [state, formAction, isPending] = useActionState(saveFiscalCredentials, initialState);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="providerSlug">Provedor de emissão</Label>
        <Input
          id="providerSlug"
          name="providerSlug"
          placeholder="Nenhum configurado ainda"
          defaultValue={summary?.providerSlug ?? ""}
        />
        <p className="text-muted-foreground text-xs">
          Sem provedor escolhido, a emissão de notas devolve um erro amigável (nunca quebra o
          pedido).
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="apiKey">Chave de API</Label>
        <Input
          id="apiKey"
          name="apiKey"
          type="password"
          placeholder={summary?.hasApiKey ? "•••••••• (configurada)" : "Sem chave configurada"}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="cnpj">CNPJ</Label>
        <Input id="cnpj" name="cnpj" defaultValue={summary?.cnpj ?? ""} />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="regimeTributario">Regime tributário</Label>
        <Input
          id="regimeTributario"
          name="regimeTributario"
          defaultValue={summary?.regimeTributario ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="serieNota">Série da nota</Label>
        <Input id="serieNota" name="serieNota" defaultValue={summary?.serieNota ?? ""} />
      </div>

      {state.message && <p className="text-destructive col-span-full text-sm">{state.message}</p>}

      <div className="col-span-full">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Salvando..." : "Salvar configuração"}
        </Button>
      </div>
    </form>
  );
}
