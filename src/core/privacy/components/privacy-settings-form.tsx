"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Hint } from "@/components/hint";
import type { ActionResult } from "@/core/action-result";
import { updatePrivacySettings } from "../actions";
import { LGPD_MIN_RETENTION_YEARS, type PrivacySettings } from "../types";

const initialState: ActionResult = { ok: false };

/**
 * Form de configuração de LGPD por organização — mesmo padrão de
 * `ClienteForm` (useActionState + `ActionResult`, sem react-hook-form).
 * Preenche o aviso público (`/privacidade`) e o texto gerado nesta
 * própria página — ver `app/(app)/lgpd/page.tsx`.
 */
export function PrivacySettingsForm({ settings }: { settings: PrivacySettings }) {
  const [state, formAction, isPending] = useActionState(updatePrivacySettings, initialState);
  const errors = state.errors ?? {};

  useEffect(() => {
    if (state.ok) toast.success("Configurações de LGPD salvas.");
  }, [state.ok]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="legalName">Razão social</Label>
        <Input id="legalName" name="legalName" defaultValue={settings.legalName} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cnpj">CNPJ</Label>
        <Input id="cnpj" name="cnpj" defaultValue={settings.cnpj} />
        {errors.cnpj?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Endereço da empresa</Label>
        <Textarea id="address" name="address" defaultValue={settings.address} rows={2} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="dpoName">Encarregado de dados (DPO)</Label>
          <Hint>
            A LGPD exige que toda empresa indique uma pessoa responsável por dúvidas/solicitações
            sobre dados pessoais — pode ser o próprio dono do negócio, não precisa ser um cargo
            dedicado.
          </Hint>
        </div>
        <Input id="dpoName" name="dpoName" defaultValue={settings.dpoName} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="dpoContact">Contato do encarregado (e-mail ou telefone)</Label>
        <Input id="dpoContact" name="dpoContact" defaultValue={settings.dpoContact} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="retentionYears">Prazo de retenção de dados fiscais (anos)</Label>
          <Hint>
            Quanto tempo os pedidos com nota fiscal ficam guardados mesmo depois que o cliente pede
            para apagar os dados dele (a cobrança/anonimização em si continua manual por enquanto —
            ver docs/lgpd-checklist.md). O mínimo permitido é {LGPD_MIN_RETENTION_YEARS} anos: é o
            prazo que o Fisco tem para fiscalizar uma nota fiscal (Código Tributário Nacional, Art.
            173/174) — configurar menos que isso deixaria a empresa sem prova fiscal antes do prazo
            legal acabar.
          </Hint>
        </div>
        <Input
          id="retentionYears"
          name="retentionYears"
          type="number"
          min={LGPD_MIN_RETENTION_YEARS}
          defaultValue={settings.retentionYears}
        />
        {errors.retentionYears?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      {state.message && <p className="text-destructive text-sm">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar configurações"}
      </Button>
    </form>
  );
}
