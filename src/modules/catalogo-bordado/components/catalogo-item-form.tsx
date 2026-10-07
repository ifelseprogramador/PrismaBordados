"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hint } from "@/components/hint";
import { formatCents } from "@/core/money";
import type { ActionResult } from "@/core/action-result";
import { createCatalogoBordadoItem, type InsertResult } from "../actions";
import type { CatalogoBordadoItem } from "../schema.types";

const initialState: InsertResult = { ok: false };
const FISCAL_FIELDS = ["ncm", "cfop", "unidade", "origem", "cst"];

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2 text-base outline-none focus-visible:ring-3 md:text-sm";

const ORIGENS = [
  ["0", "0 — Nacional"],
  ["1", "1 — Estrangeira, importação direta"],
  ["2", "2 — Estrangeira, adquirida no mercado interno"],
  ["3", "3 — Nacional, conteúdo de importação > 40%"],
  ["4", "4 — Nacional, processos produtivos básicos"],
  ["5", "5 — Nacional, conteúdo de importação ≤ 40%"],
  ["6", "6 — Estrangeira, sem similar nacional (importação direta)"],
  ["7", "7 — Estrangeira, sem similar nacional (mercado interno)"],
  ["8", "8 — Nacional, conteúdo de importação > 70%"],
] as const;

/** Form de criação/edição de item de catálogo. Campos controlados: um erro
 * de validação só marca o campo inválido e mantém o que já foi digitado.
 * Dados fiscais (peça pronta → NF-e) ficam numa seção recolhida; NCM e CFOP
 * vazios usam o padrão configurado em Fiscal. */
export function CatalogoItemForm({
  item,
  action = createCatalogoBordadoItem,
}: {
  item?: CatalogoBordadoItem;
  action?: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    action as (prevState: InsertResult, formData: FormData) => Promise<InsertResult>,
    initialState,
  );
  const errors = state.errors ?? {};
  const [values, setValues] = useState<Record<string, string>>(() => ({
    tipoProduto: item?.tipoProduto ?? "",
    modeloPadrao: item?.modeloPadrao ?? "",
    tamanhosAceitos: item?.tamanhosAceitos.join(", ") ?? "",
    coresAceitas: item?.coresAceitas.join(", ") ?? "",
    defaultPrice: item ? formatCents(item.defaultPriceCents).replace("R$", "").trim() : "",
    ncm: item?.ncm ?? "",
    cfop: item?.cfop ?? "",
    unidade: item?.unidade ?? "UN",
    origem: item?.origem ?? "0",
    cst: item?.cst ?? "",
  }));
  const [fiscalOpen, setFiscalOpen] = useState(() => Boolean(item?.ncm || item?.cfop || item?.cst));
  const set = (f: string, v: string) => setValues((s) => ({ ...s, [f]: v }));

  useEffect(() => {
    if (state.ok) {
      if (!item && state.id) router.push(`/catalogo-bordado/${state.id}`);
      else toast.success("Item de catálogo salvo.");
      return;
    }
    const first = Object.keys(errors)[0];
    if (first) setTimeout(() => document.getElementById(first)?.focus(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function field(id: string, label: string, opts: { hint?: string; placeholder?: string } = {}) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={id}>{label}</Label>
          {opts.hint && <Hint>{opts.hint}</Hint>}
        </div>
        <Input
          id={id}
          name={id}
          placeholder={opts.placeholder}
          value={values[id]}
          onChange={(e) => set(id, e.target.value)}
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

  return (
    <form
      data-unsaved-guard
      key={item?.updatedAt?.toString()}
      action={formAction}
      className="flex flex-col gap-4"
    >
      {field("tipoProduto", "Tipo de produto", { placeholder: "ex.: toalha, camiseta" })}
      {field("modeloPadrao", "Modelo padrão (opcional)")}
      {field("tamanhosAceitos", "Tamanhos aceitos (separados por vírgula)", {
        placeholder: "P, M, G",
      })}
      {field("coresAceitas", "Cores aceitas (separadas por vírgula)", {
        placeholder: "branco, preto",
      })}
      {field("defaultPrice", "Preço padrão (sugestão)", {
        placeholder: "0,00",
        hint: "Só pré-preenche o valor unitário quando este item é escolhido num pedido — o valor final de cada pedido continua editável ali, já que o preço real do bordado costuma variar por complexidade mesmo dentro do mesmo tipo de produto.",
      })}

      <details
        open={fiscalOpen || FISCAL_FIELDS.some((f) => errors[f])}
        onToggle={(e) => setFiscalOpen(e.currentTarget.open)}
        className="rounded-lg border [&[open]>summary>svg]:rotate-90"
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium">
          <ChevronRight className="h-4 w-4 transition-transform" />
          Dados fiscais
          <span className="text-muted-foreground ml-auto text-xs font-normal">
            para nota fiscal (NF-e)
          </span>
        </summary>
        <div className="grid gap-4 border-t p-3 sm:grid-cols-2">
          {field("ncm", "NCM", {
            hint: "Classificação fiscal da peça, 8 dígitos. Vazio = usa o NCM padrão da tela Fiscal.",
            placeholder: "ex.: 63026000",
          })}
          {field("cfop", "CFOP", {
            hint: "Código da operação de venda. 5102 = venda dentro do estado; 6102 = para outro estado. Vazio = usa o padrão da tela Fiscal.",
            placeholder: "ex.: 5102",
          })}
          {field("unidade", "Unidade", { hint: "UN, PC, KG, MT…" })}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="origem">Origem da mercadoria</Label>
            <select
              id="origem"
              name="origem"
              className={selectClass}
              value={values.origem}
              onChange={(e) => set("origem", e.target.value)}
            >
              {ORIGENS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          {field("cst", "CST / CSOSN", {
            hint: "Situação tributária do ICMS. Simples Nacional usa CSOSN (3 dígitos, ex.: 102); demais regimes usam CST (2 dígitos, ex.: 00). Pergunte ao seu contador.",
          })}
        </div>
      </details>

      {state.message && <p className="text-destructive text-sm">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar item"}
      </Button>
    </form>
  );
}
