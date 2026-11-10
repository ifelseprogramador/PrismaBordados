"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CalendarDays,
  HandCoins,
  Package,
  Receipt,
  ShoppingBag,
  StickyNote,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  FACIL_INPUT_CLASS,
  FacilChoiceField,
  FacilField,
  FacilWizard,
  type WizardStep,
} from "@/components/facil/facil-wizard";
import { formatDate } from "@/core/format";
import { createLancamento } from "../actions";
import { LANCAMENTO_CATEGORIA_LABELS } from "../validation";

type Categoria = keyof typeof LANCAMENTO_CATEGORIA_LABELS;

const CATEGORIAS: Record<"entrada" | "saida", { value: Categoria; icon: LucideIcon }[]> = {
  entrada: [
    { value: "venda", icon: ShoppingBag },
    { value: "adiantamento", icon: HandCoins },
    { value: "saldo_recebido", icon: Banknote },
    { value: "outro", icon: Tag },
  ],
  saida: [
    { value: "compra_material", icon: Package },
    { value: "despesa_fixa", icon: Receipt },
    { value: "outro", icon: Tag },
  ],
};

/**
 * Lançamento avulso no modo Fácil (entrada sem cliente por trás, ou saída):
 * valor → tipo de gasto/ganho → data → anotação → conferência. MESMA action
 * (`createLancamento`) e mesmos `name` do formulário formal: `type`,
 * `categoria`, `amount`, `date`, `description`. A action não redireciona: ao
 * dar certo, volta para o Financeiro.
 */
export function NewLancamentoFacil({ type }: { type: "entrada" | "saida" }) {
  const router = useRouter();
  // Lazy: `new Date()` é impuro e não pode rodar durante a renderização.
  const [today] = useState(() => new Date().toLocaleDateString("en-CA"));
  const entrada = type === "entrada";

  const steps: WizardStep[] = [
    {
      id: "valor",
      title: entrada ? "Quanto entrou?" : "Quanto você gastou?",
      icon: Banknote,
      fields: ["amount", "amountCents", "type"],
      content: (
        <FacilField label="Valor (R$)" htmlFor="facil-amount">
          <input type="hidden" name="type" value={type} />
          <Input
            id="facil-amount"
            name="amount"
            inputMode="decimal"
            placeholder="0,00"
            required
            autoComplete="off"
            autoFocus
            className={FACIL_INPUT_CLASS}
          />
        </FacilField>
      ),
    },
    {
      id: "categoria",
      title: entrada ? "De onde veio?" : "Com o que foi o gasto?",
      icon: Tag,
      fields: ["categoria"],
      content: (
        <FacilChoiceField
          name="categoria"
          defaultValue={CATEGORIAS[type][0].value}
          options={CATEGORIAS[type].map(({ value, icon }) => ({
            value,
            label: LANCAMENTO_CATEGORIA_LABELS[value],
            icon,
          }))}
        />
      ),
    },
    {
      id: "data",
      title: "Em que dia foi?",
      hint: "Pode ser uma data futura, para uma conta que ainda vai pagar.",
      icon: CalendarDays,
      fields: ["date"],
      content: (
        <FacilField label="Data" htmlFor="facil-date">
          <Input
            id="facil-date"
            name="date"
            type="date"
            required
            defaultValue={today}
            className={FACIL_INPUT_CLASS}
          />
        </FacilField>
      ),
    },
    {
      id: "descricao",
      title: "Quer anotar alguma coisa?",
      hint: "Opcional. Ex.: linha de bordar, conta de luz.",
      icon: StickyNote,
      fields: ["description"],
      content: (
        <FacilField label="Anotação" htmlFor="facil-description">
          <Input
            id="facil-description"
            name="description"
            autoComplete="off"
            className={FACIL_INPUT_CLASS}
          />
        </FacilField>
      ),
    },
  ];

  return (
    <FacilWizard
      action={createLancamento}
      onSuccess={() => {
        toast.success(entrada ? "Entrada registrada!" : "Saída registrada!");
        router.push("/financeiro");
      }}
      steps={steps}
      cancelHref="/financeiro"
      submitLabel={entrada ? "Registrar entrada" : "Registrar saída"}
      review={[
        { name: "type", label: "Tipo", format: (v) => (v === "entrada" ? "Entrada" : "Saída") },
        { name: "amount", label: "Valor", format: (v) => `R$ ${v}` },
        {
          name: "categoria",
          label: "Categoria",
          format: (v) => LANCAMENTO_CATEGORIA_LABELS[v as Categoria] ?? v,
        },
        { name: "date", label: "Data", format: (v) => formatDate(v) },
        { name: "description", label: "Anotação" },
      ]}
    />
  );
}
