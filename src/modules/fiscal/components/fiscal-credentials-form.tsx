"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hint } from "@/components/hint";
import type { ActionResult } from "@/core/action-result";
import { formatDocument } from "@/core/document";
import { UFS, formatBpsAsPercent, formatCep, isValidCep } from "@/core/fiscal-fields";
import { buscarCepEmitente, saveFiscalCredentials } from "../actions";
import { REGIMES_TRIBUTARIOS } from "../validation";

const initialState: ActionResult = { ok: false };

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-8 w-full rounded-lg border bg-transparent px-2 text-base outline-none focus-visible:ring-3 md:text-sm";

export interface FiscalCredentialsSummary {
  providerSlug: string | null;
  cnpj: string | null;
  regimeTributario: string | null;
  serieNota: string | null;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  ie: string | null;
  im: string | null;
  zip: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  ibgeCode: string | null;
  defaultNcm: string | null;
  defaultCfop: string | null;
  codigoServico: string | null;
  cnae: string | null;
  issRateBps: number | null;
  hasApiKey: boolean;
}

const SECTIONS = {
  company: ["cnpj", "razaoSocial", "nomeFantasia", "regimeTributario", "ie", "im", "serieNota"],
  address: ["zip", "street", "number", "complement", "district", "city", "state", "ibgeCode"],
  defaults: ["defaultNcm", "defaultCfop", "codigoServico", "cnae", "issRate"],
};

function toValues(s: FiscalCredentialsSummary | null): Record<string, string> {
  return {
    providerSlug: s?.providerSlug ?? "",
    cnpj: s?.cnpj ? formatDocument(s.cnpj) : "",
    razaoSocial: s?.razaoSocial ?? "",
    nomeFantasia: s?.nomeFantasia ?? "",
    regimeTributario: s?.regimeTributario ?? "",
    ie: s?.ie ?? "",
    im: s?.im ?? "",
    serieNota: s?.serieNota ?? "",
    zip: s?.zip ? formatCep(s.zip) : "",
    street: s?.street ?? "",
    number: s?.number ?? "",
    complement: s?.complement ?? "",
    district: s?.district ?? "",
    city: s?.city ?? "",
    state: s?.state ?? "",
    ibgeCode: s?.ibgeCode ?? "",
    defaultNcm: s?.defaultNcm ?? "",
    defaultCfop: s?.defaultCfop ?? "",
    codigoServico: s?.codigoServico ?? "",
    cnae: s?.cnae ?? "",
    issRate: s?.issRateBps != null ? formatBpsAsPercent(s.issRateBps) : "",
  };
}

/** Configuração fiscal da empresa (emitente): dados exigidos em NF-e/NFS-e e
 * padrões de produto/serviço. Campos controlados (erro só marca o campo) e
 * seções recolhíveis. `providerSlug` fica vazio até contratar um provedor;
 * nunca pré-preenche `apiKey`. */
export function FiscalCredentialsForm({ summary }: { summary: FiscalCredentialsSummary | null }) {
  const [state, formAction, isPending] = useActionState(saveFiscalCredentials, initialState);
  const errors = state.errors ?? {};
  const [values, setValues] = useState(() => toValues(summary));
  const [cepPending, startCep] = useTransition();
  const [open, setOpen] = useState({
    company: true,
    address: Boolean(summary?.zip || summary?.street),
    defaults: Boolean(summary?.defaultNcm || summary?.codigoServico),
  });
  const set = (f: string, v: string) => setValues((s) => ({ ...s, [f]: v }));
  const isOpen = (k: keyof typeof SECTIONS) => open[k] || SECTIONS[k].some((f) => errors[f]);

  useEffect(() => {
    if (state.ok) {
      toast.success("Configuração fiscal salva.");
      return;
    }
    const first = Object.keys(errors)[0];
    if (first) setTimeout(() => document.getElementById(first)?.focus(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function onCep(raw: string) {
    const zip = formatCep(raw);
    set("zip", zip);
    if (!isValidCep(zip)) return;
    startCep(async () => {
      const found = await buscarCepEmitente(zip);
      if (!found) {
        toast.info("CEP não encontrado — preencha o endereço manualmente.");
        return;
      }
      setValues((v) => ({
        ...v,
        street: v.street || found.street,
        district: v.district || found.district,
        city: found.city,
        state: found.state,
        ibgeCode: found.ibgeCode,
      }));
    });
  }

  function field(
    id: string,
    label: string,
    opts: {
      hint?: string;
      type?: string;
      placeholder?: string;
      onChange?: (v: string) => void;
    } = {},
  ) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={id}>{label}</Label>
          {opts.hint && <Hint>{opts.hint}</Hint>}
        </div>
        <Input
          id={id}
          name={id}
          type={opts.type}
          placeholder={opts.placeholder}
          value={values[id]}
          onChange={(e) => (opts.onChange ?? ((v) => set(id, v)))(e.target.value)}
          aria-invalid={!!errors[id]}
        />
        {errors[id]?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>
    );
  }

  const section = (
    key: keyof typeof SECTIONS,
    title: string,
    summaryText: string,
    body: React.ReactNode,
  ) => (
    <details
      open={isOpen(key)}
      onToggle={(e) => setOpen((o) => ({ ...o, [key]: e.currentTarget.open }))}
      className="rounded-lg border [&[open]>summary>svg]:rotate-90"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium">
        <ChevronRight className="h-4 w-4 transition-transform" />
        {title}
        <span className="text-muted-foreground ml-auto text-xs font-normal">{summaryText}</span>
      </summary>
      <div className="grid gap-4 border-t p-3 sm:grid-cols-2">{body}</div>
    </details>
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("providerSlug", "Provedor de emissão", {
          placeholder: "Nenhum configurado ainda",
          hint: "Sem provedor escolhido, a emissão devolve um erro amigável (nunca quebra o pedido).",
        })}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="apiKey">Chave de API</Label>
          <Input
            id="apiKey"
            name="apiKey"
            type="password"
            placeholder={summary?.hasApiKey ? "•••••••• (configurada)" : "Sem chave configurada"}
          />
        </div>
      </div>

      {section(
        "company",
        "Dados da empresa",
        "obrigatórios para emitir",
        <>
          {field("cnpj", "CNPJ", { onChange: (v) => set("cnpj", v) })}
          {field("razaoSocial", "Razão social", { hint: "Nome oficial, como consta no CNPJ." })}
          {field("nomeFantasia", "Nome fantasia")}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="regimeTributario">Regime tributário</Label>
              <Hint>
                MEI, Simples Nacional, Lucro presumido ou Lucro real — confirme com seu contador.
              </Hint>
            </div>
            <select
              id="regimeTributario"
              name="regimeTributario"
              className={selectClass}
              value={values.regimeTributario}
              onChange={(e) => set("regimeTributario", e.target.value)}
              aria-invalid={!!errors.regimeTributario}
            >
              <option value="">—</option>
              {Object.entries(REGIMES_TRIBUTARIOS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            {errors.regimeTributario?.map((e) => (
              <p key={e} className="text-destructive text-sm">
                {e}
              </p>
            ))}
          </div>
          {field("ie", "Inscrição Estadual (IE)", { hint: "Exigida na NF-e (venda de produto)." })}
          {field("im", "Inscrição Municipal (IM)", { hint: "Exigida na NFS-e (serviço)." })}
          {field("serieNota", "Série da nota", { hint: "Normalmente 1." })}
        </>,
      )}

      {section(
        "address",
        "Endereço da empresa",
        cepPending ? "buscando CEP…" : "digite o CEP para preencher",
        <>
          {field("zip", "CEP", {
            onChange: onCep,
            hint: "Ao digitar o CEP completo, rua, bairro, cidade, UF e código IBGE são preenchidos.",
          })}
          {field("street", "Logradouro")}
          {field("number", "Número")}
          {field("complement", "Complemento")}
          {field("district", "Bairro")}
          {field("city", "Cidade")}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="state">UF</Label>
            <select
              id="state"
              name="state"
              className={selectClass}
              value={values.state}
              onChange={(e) => set("state", e.target.value)}
              aria-invalid={!!errors.state}
            >
              <option value="">—</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
            {errors.state?.map((e) => (
              <p key={e} className="text-destructive text-sm">
                {e}
              </p>
            ))}
          </div>
          {field("ibgeCode", "Código IBGE do município", { hint: "7 dígitos; vem do CEP." })}
        </>,
      )}

      {section(
        "defaults",
        "Padrões fiscais",
        "usados quando o item não tem dado próprio",
        <>
          {field("defaultNcm", "NCM padrão", {
            hint: "8 dígitos. Usado em peças do catálogo sem NCM próprio.",
          })}
          {field("defaultCfop", "CFOP padrão", {
            hint: "5102 = venda dentro do estado; 6102 = para outro estado.",
          })}
          {field("codigoServico", "Código do serviço (LC 116)", {
            hint: "Item da lista de serviços do bordado, ex.: 14.01. Confirme com seu contador.",
          })}
          {field("cnae", "CNAE", { hint: "7 dígitos (opcional)." })}
          {field("issRate", "Alíquota de ISS (%)", {
            hint: "Percentual do seu município, ex.: 2,5.",
          })}
        </>,
      )}

      {state.message && <p className="text-destructive text-sm">{state.message}</p>}

      <div>
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Salvando..." : "Salvar configuração"}
        </Button>
      </div>
    </form>
  );
}
