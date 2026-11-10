"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CalendarClock, CalendarDays, Scissors, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  FacilItemsField,
  FacilSearchField,
  describeLines,
  type FacilOption,
  type MiniCreate,
  type MiniResult,
} from "@/components/facil/facil-search";
import {
  FACIL_INPUT_CLASS,
  FacilField,
  FacilWizard,
  type WizardStep,
} from "@/components/facil/facil-wizard";
import { catalogoBordadoMiniFields, customerMiniFields } from "@/components/facil/mini-fields";
import type { ActionResult } from "@/core/action-result";
import { formatDate } from "@/core/format";
import { parseReaisInput } from "@/core/money";
import type { InsertResult } from "../actions";

/**
 * As buscas e os cadastros rápidos vêm PRONTOS da página (composição entre
 * módulos acontece na camada de rotas: este módulo não importa clientes nem
 * catálogo).
 */
export interface PedidoPickers {
  searchClientes: (term: string) => Promise<FacilOption[]>;
  createCliente: (values: Record<string, string>) => Promise<MiniResult>;
  searchCatalogo: (term: string) => Promise<FacilOption[]>;
  createCatalogoItem: (values: Record<string, string>) => Promise<MiniResult>;
}

/**
 * Novo pedido no modo Fácil: cliente → peças → entrega → entrada → vencimento
 * → conferência. O cliente e o produto podem ser CADASTRADOS ali mesmo, sem
 * sair do pedido; as buscas rodam no servidor (aguentam milhares de
 * registros). Usa a MESMA action do formulário formal (a que também lança a
 * entrada no financeiro), mas já levando os itens na criação. A data do pedido
 * é a de hoje (campo escondido).
 */
export function NewPedidoFacil({
  pickers,
  action,
}: {
  pickers: PedidoPickers;
  action: (prevState: InsertResult, formData: FormData) => Promise<InsertResult>;
}) {
  const router = useRouter();
  // Lazy: `new Date()` é impuro e não pode rodar durante a renderização.
  const [today] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [cliente, setCliente] = useState<FacilOption | null>(null);

  const createCliente: MiniCreate = {
    id: "cliente",
    label: "Cadastrar novo cliente",
    title: "Novo cliente",
    // Telefone é obrigatório no cadastro de clientes deste sistema.
    fields: customerMiniFields({ phoneRequired: true }),
    submit: pickers.createCliente,
  };
  const createProduto: MiniCreate = {
    id: "produto",
    label: "Cadastrar novo produto no catálogo",
    title: "Novo produto",
    fields: catalogoBordadoMiniFields(),
    submit: pickers.createCatalogoItem,
  };
  const produtoAvulso: MiniCreate = {
    id: "avulso",
    label: "Produto avulso (sem cadastrar)",
    title: "Produto avulso",
    submitLabel: "Adicionar",
    fields: [
      { key: "label", label: "Produto", required: true },
      { key: "price", label: "Preço (R$)", type: "money", required: true, placeholder: "0,00" },
    ],
    submit: async (values) => {
      const cents = parseReaisInput(values.price ?? "");
      if (cents === null) return { ok: false, errors: { price: ["Informe um preço válido."] } };
      return {
        ok: true,
        option: { value: `free:${values.label}`, label: values.label, priceCents: cents },
      };
    },
  };

  const steps: WizardStep[] = [
    {
      id: "cliente",
      title: "Para qual cliente é o pedido?",
      hint: "Digite o nome ou o telefone. Cliente novo? Cadastre aqui mesmo.",
      icon: UserRound,
      fields: ["customerId"],
      content: (
        <FacilSearchField
          name="customerId"
          required
          autoFocus
          search={pickers.searchClientes}
          creates={[createCliente]}
          onChange={setCliente}
          placeholder="Procurar cliente por nome ou telefone"
          emptyText="Nenhum cliente cadastrado ainda."
        />
      ),
    },
    {
      id: "itens",
      title: "O que vai ser bordado?",
      hint: "Opcional agora: dá para adicionar depois no pedido.",
      icon: Scissors,
      fields: ["itemsJson"],
      content: (
        <FacilItemsField
          name="itemsJson"
          search={pickers.searchCatalogo}
          creates={[createProduto, produtoAvulso]}
          placeholder="Procurar produto no catálogo"
          emptyText="O catálogo ainda está vazio."
          lineFields={[
            { key: "modelo", label: "Modelo" },
            { key: "tamanho", label: "Tamanho", suggestionsKey: "tamanhos" },
            { key: "cor", label: "Cor", suggestionsKey: "cores" },
          ]}
        />
      ),
    },
    {
      id: "entrega",
      title: "Para quando é a entrega?",
      hint: "Opcional. Dá para combinar depois.",
      icon: CalendarDays,
      fields: ["orderDate", "deliveryDate", "deliveryTime"],
      content: (
        <div className="flex flex-col gap-4">
          <input type="hidden" name="orderDate" value={today} />
          <FacilField label="Data da entrega" htmlFor="facil-delivery-date">
            <Input
              id="facil-delivery-date"
              name="deliveryDate"
              type="date"
              className={FACIL_INPUT_CLASS}
            />
          </FacilField>
          <FacilField label="Horário (opcional)" htmlFor="facil-delivery-time">
            <Input
              id="facil-delivery-time"
              name="deliveryTime"
              placeholder="ex.: 14:30"
              className={FACIL_INPUT_CLASS}
            />
          </FacilField>
        </div>
      ),
    },
    {
      id: "entrada",
      title: "O cliente já deu entrada?",
      hint: "Opcional. Se deu, informe o valor — ele já entra no financeiro.",
      icon: Banknote,
      fields: ["adiantamento", "adiantamentoCents"],
      content: (
        <FacilField label="Valor da entrada (R$)" htmlFor="facil-adiantamento">
          <Input
            id="facil-adiantamento"
            name="adiantamento"
            inputMode="decimal"
            placeholder="0,00"
            autoComplete="off"
            className={FACIL_INPUT_CLASS}
          />
        </FacilField>
      ),
    },
    {
      id: "vencimento",
      title: "Quando o cliente paga o resto?",
      hint: "Opcional. Ajuda a prever quanto vai entrar no caixa.",
      icon: CalendarClock,
      fields: ["paymentDueDate"],
      content: (
        <FacilField label="Vencimento do saldo" htmlFor="facil-due">
          <Input id="facil-due" name="paymentDueDate" type="date" className={FACIL_INPUT_CLASS} />
        </FacilField>
      ),
    },
  ];

  return (
    <FacilWizard
      // `InsertResult` estende `ActionResult`; o assistente só lê `ok`/`errors`/`message`.
      action={action as (prev: ActionResult, formData: FormData) => Promise<ActionResult>}
      onSuccess={(result) => {
        toast.success("Pedido criado!");
        router.push(`/pedidos/${(result as InsertResult).id ?? ""}?criado=1`);
      }}
      steps={steps}
      cancelHref="/pedidos"
      submitLabel="Criar pedido"
      review={[
        { name: "customerId", label: "Cliente", format: () => cliente?.label ?? "" },
        { name: "itemsJson", label: "Itens", format: describeLines },
        { name: "deliveryDate", label: "Entrega", format: (v) => formatDate(v) },
        { name: "deliveryTime", label: "Horário" },
        { name: "adiantamento", label: "Entrada", format: (v) => `R$ ${v}` },
        { name: "paymentDueDate", label: "Vencimento do saldo", format: (v) => formatDate(v) },
      ]}
    />
  );
}
