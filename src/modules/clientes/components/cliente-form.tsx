"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hint } from "@/components/hint";
import type { ActionResult } from "@/core/action-result";
import { formatDocument } from "@/core/document";
import { UFS, formatCep, isValidCep } from "@/core/fiscal-fields";
import { buscarCep, createCliente, type InsertResult } from "../actions";
import type { ClienteComEndereco } from "../schema.types";

const initialState: InsertResult = { ok: false };

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30 h-8 w-full rounded-lg border bg-transparent px-2 text-base outline-none focus-visible:ring-3 md:text-sm";

const FISCAL_FIELDS = ["legalName", "tradeName", "ieIndicator", "ie", "im"];
const ADDRESS_FIELDS = [
  "zip",
  "street",
  "number",
  "complement",
  "district",
  "city",
  "state",
  "ibgeCode",
];

type Values = Record<string, string>;

function toValues(c?: ClienteComEndereco): Values {
  const e = c?.endereco;
  return {
    type: c?.type ?? "pf",
    name: c?.name ?? "",
    legalName: c?.legalName ?? "",
    tradeName: c?.tradeName ?? "",
    document: c?.document ? formatDocument(c.document) : "",
    ieIndicator: c?.ieIndicator ?? "nao_contribuinte",
    ie: c?.ie ?? "",
    im: c?.im ?? "",
    phone: c?.phone ?? "",
    email: c?.email ?? "",
    zip: e?.zip ? formatCep(e.zip) : "",
    street: e?.street ?? "",
    number: e?.number ?? "",
    complement: e?.complement ?? "",
    district: e?.district ?? "",
    city: e?.city ?? "",
    state: e?.state ?? "",
    ibgeCode: e?.ibgeCode ?? "",
  };
}

/** Form de criação/edição de cliente. Campos controlados: um erro de
 * validação só marca o campo inválido, nunca apaga o que já estava certo
 * (o formulário é resetado pelo React após a action, então o estado vive
 * aqui). Seções fiscais/endereço ficam recolhidas, abrindo sozinhas se
 * tiverem dado ou erro. Sem `cliente`/`action`, cria e navega para a ficha. */
export function ClienteForm({
  cliente,
  action = createCliente,
}: {
  cliente?: ClienteComEndereco;
  action?: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    action as (prevState: InsertResult, formData: FormData) => Promise<InsertResult>,
    initialState,
  );
  const errors = state.errors ?? {};
  const [values, setValues] = useState<Values>(() => toValues(cliente));
  const [cepPending, startCep] = useTransition();
  const hasData = (fields: string[]) =>
    fields.some((f) => values[f] && !(f === "ieIndicator" && values[f] === "nao_contribuinte"));
  const hasError = (fields: string[]) => fields.some((f) => errors[f]);
  const [fiscalOpen, setFiscalOpen] = useState(() => hasData(FISCAL_FIELDS));
  const [addressOpen, setAddressOpen] = useState(() => hasData(ADDRESS_FIELDS));

  const set = (field: string, value: string) => setValues((v) => ({ ...v, [field]: value }));
  const isPj = values.type === "pj";

  useEffect(() => {
    if (state.ok) {
      if (!cliente && state.id) router.push(`/clientes/${state.id}`);
      else toast.success("Cliente salvo.");
      return;
    }
    const first = Object.keys(errors)[0];
    if (!first) return;
    // A seção com erro já abre por derivação (hasError); espera abrir antes de focar o primeiro campo inválido.
    setTimeout(() => document.getElementById(first)?.focus(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function onCepChange(raw: string) {
    const zip = formatCep(raw);
    set("zip", zip);
    if (!isValidCep(zip)) return;
    startCep(async () => {
      const found = await buscarCep(zip);
      if (!found) {
        toast.info("CEP não encontrado — preencha o endereço manualmente.");
        return;
      }
      setValues((v) => ({
        ...v,
        // Só preenche o que o usuário ainda não digitou.
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
      autoComplete?: string;
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
          autoComplete={opts.autoComplete}
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
    title: string,
    open: boolean,
    setOpen: (o: boolean) => void,
    summary: string,
    children: React.ReactNode,
  ) => (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="group rounded-lg border [&[open]>summary>svg]:rotate-90"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium">
        <ChevronRight className="h-4 w-4 transition-transform" />
        {title}
        <span className="text-muted-foreground ml-auto text-xs font-normal">{summary}</span>
      </summary>
      <div className="grid gap-4 border-t p-3 sm:grid-cols-2">{children}</div>
    </details>
  );

  return (
    // key nova a cada salvamento: remonta com os dados frescos do servidor.
    <form key={cliente?.updatedAt?.toString()} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type">Tipo de cliente</Label>
        <select
          id="type"
          name="type"
          className={selectClass}
          value={values.type}
          onChange={(e) => set("type", e.target.value)}
        >
          <option value="pf">Pessoa física</option>
          <option value="pj">Pessoa jurídica (empresa)</option>
        </select>
      </div>

      {field("name", isPj ? "Nome / contato" : "Nome", { autoComplete: "name" })}
      {field("document", isPj ? "CNPJ (opcional)" : "CPF (opcional)", {
        hint: "Com ou sem pontuação. Os dígitos verificadores são conferidos. Necessário para emitir nota fiscal.",
        onChange: (v) => set("document", v),
      })}
      {field("phone", "Telefone", { type: "tel", autoComplete: "tel" })}
      {field("email", "E-mail (opcional)", {
        type: "email",
        autoComplete: "email",
        hint: "Usado para enviar a nota fiscal ao cliente.",
      })}

      {section(
        "Dados fiscais",
        fiscalOpen || hasError(FISCAL_FIELDS),
        setFiscalOpen,
        "para nota fiscal",
        <>
          {isPj && (
            <>
              {field("legalName", "Razão social", {
                hint: "Nome oficial da empresa, como consta no CNPJ.",
              })}
              {field("tradeName", "Nome fantasia")}
            </>
          )}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="ieIndicator">Contribuinte de ICMS?</Label>
              <Hint>
                Contribuinte: empresa com Inscrição Estadual ativa. Isento: empresa isenta de IE.
                Não contribuinte: pessoa física ou quem não tem IE (caso mais comum).
              </Hint>
            </div>
            <select
              id="ieIndicator"
              name="ieIndicator"
              className={selectClass}
              value={values.ieIndicator}
              onChange={(e) => set("ieIndicator", e.target.value)}
            >
              <option value="nao_contribuinte">Não contribuinte</option>
              <option value="contribuinte">Contribuinte (tem IE)</option>
              <option value="isento">Isento</option>
            </select>
          </div>
          {values.ieIndicator === "contribuinte" &&
            field("ie", "Inscrição Estadual (IE)", {
              hint: "Número da IE do cliente, da SEFAZ do estado dele.",
            })}
          {field("im", "Inscrição Municipal (IM)", {
            hint: "Só para nota de serviço (NFS-e), quando o cliente tiver.",
          })}
        </>,
      )}

      {section(
        "Endereço",
        addressOpen || hasError(ADDRESS_FIELDS),
        setAddressOpen,
        cepPending ? "buscando CEP…" : "digite o CEP para preencher",
        <>
          {field("zip", "CEP", {
            autoComplete: "postal-code",
            hint: "Ao digitar o CEP completo, rua, bairro, cidade, UF e código IBGE são preenchidos.",
            onChange: onCepChange,
          })}
          {field("street", "Logradouro", { autoComplete: "address-line1" })}
          {field("number", "Número")}
          {field("complement", "Complemento")}
          {field("district", "Bairro")}
          {field("city", "Cidade", { autoComplete: "address-level2" })}
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
          {field("ibgeCode", "Código IBGE do município", {
            hint: "7 dígitos, exigido na nota. Vem do CEP; se precisar, consulte no site do IBGE.",
          })}
          {!cliente?.endereco && cliente?.address && (
            <p className="text-muted-foreground text-xs sm:col-span-2">
              Endereço antigo (texto livre): {cliente.address}
            </p>
          )}
        </>,
      )}

      {state.message && <p className="text-destructive text-sm">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar cliente"}
      </Button>
    </form>
  );
}
