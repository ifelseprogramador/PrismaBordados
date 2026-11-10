"use client";

import { useRouter } from "next/navigation";
import { Banknote, Palette, Ruler, Shirt } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  FACIL_INPUT_CLASS,
  FacilField,
  FacilWizard,
  type WizardStep,
} from "@/components/facil/facil-wizard";
import { createCatalogoBordadoItem, type InsertResult } from "../actions";

/**
 * Novo produto do catálogo no modo Fácil: uma pergunta por tela, com a MESMA
 * Server Action e a MESMA validação do formulário formal (`CatalogoItemForm`).
 * Tamanhos e cores são listas separadas por vírgula, como no formulário formal.
 * A action não redireciona: ao dar certo, a tela leva para a ficha.
 */
export function NewCatalogoItemFacil() {
  const router = useRouter();

  const steps: WizardStep[] = [
    {
      id: "produto",
      title: "Que produto você borda?",
      hint: "Ex.: Camiseta, Boné, Toalha.",
      icon: Shirt,
      fields: ["tipoProduto", "modeloPadrao"],
      content: (
        <div className="flex flex-col gap-4">
          <FacilField label="Produto" htmlFor="facil-tipo">
            <Input
              id="facil-tipo"
              name="tipoProduto"
              required
              autoComplete="off"
              autoFocus
              className={FACIL_INPUT_CLASS}
            />
          </FacilField>
          <FacilField label="Modelo padrão (opcional)" htmlFor="facil-modelo">
            <Input id="facil-modelo" name="modeloPadrao" className={FACIL_INPUT_CLASS} />
          </FacilField>
        </div>
      ),
    },
    {
      id: "tamanhos",
      title: "Quais tamanhos você aceita?",
      hint: "Opcional. Separe por vírgula: P, M, G, GG.",
      icon: Ruler,
      fields: ["tamanhosAceitos"],
      content: (
        <FacilField label="Tamanhos" htmlFor="facil-tamanhos">
          <Input
            id="facil-tamanhos"
            name="tamanhosAceitos"
            placeholder="P, M, G"
            autoComplete="off"
            className={FACIL_INPUT_CLASS}
          />
        </FacilField>
      ),
    },
    {
      id: "cores",
      title: "E quais cores?",
      hint: "Opcional. Separe por vírgula: branco, preto, azul.",
      icon: Palette,
      fields: ["coresAceitas"],
      content: (
        <FacilField label="Cores" htmlFor="facil-cores">
          <Input
            id="facil-cores"
            name="coresAceitas"
            placeholder="branco, preto"
            autoComplete="off"
            className={FACIL_INPUT_CLASS}
          />
        </FacilField>
      ),
    },
    {
      id: "preco",
      title: "Quanto você cobra?",
      hint: "É o preço padrão: no pedido dá para mudar.",
      icon: Banknote,
      fields: ["defaultPrice", "defaultPriceCents"],
      content: (
        <FacilField label="Preço (R$)" htmlFor="facil-preco">
          <Input
            id="facil-preco"
            name="defaultPrice"
            inputMode="decimal"
            placeholder="0,00"
            autoComplete="off"
            className={FACIL_INPUT_CLASS}
          />
        </FacilField>
      ),
    },
  ];

  return (
    <FacilWizard
      action={createCatalogoBordadoItem}
      onSuccess={(result) => {
        toast.success("Produto cadastrado!");
        router.push(`/catalogo-bordado/${(result as InsertResult).id ?? ""}`);
      }}
      steps={steps}
      cancelHref="/catalogo-bordado"
      submitLabel="Salvar produto"
      review={[
        { name: "tipoProduto", label: "Produto" },
        { name: "modeloPadrao", label: "Modelo" },
        { name: "tamanhosAceitos", label: "Tamanhos" },
        { name: "coresAceitas", label: "Cores" },
        { name: "defaultPrice", label: "Preço", format: (v) => `R$ ${v}` },
      ]}
    />
  );
}
