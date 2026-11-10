"use server";

import { CATALOGO_QUICK_KEYS } from "@/components/facil/mini-fields";
import { and, asc, eq, ilike } from "drizzle-orm";
import { requireModule } from "@/core/auth";
import { formatCents } from "@/core/money";
import type { FacilOption, MiniResult } from "@/components/facil/facil-search";
import { createCatalogoBordadoItem } from "./actions";
import { catalogoBordadoItens } from "./schema";

const SEARCH_LIMIT = 20;
const RECENT_LIMIT = 8;

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}

function toOption(item: {
  id: string;
  tipoProduto: string;
  modeloPadrao: string | null;
  tamanhosAceitos: string[];
  coresAceitas: string[];
  defaultPriceCents: number;
}): FacilOption {
  return {
    value: item.id,
    label: item.tipoProduto,
    subtitle: [item.modeloPadrao, formatCents(item.defaultPriceCents)].filter(Boolean).join(" · "),
    priceCents: item.defaultPriceCents,
    // Viram campos editáveis da linha do pedido (modelo, tamanho, cor); as
    // listas aceitas viram atalhos de toque.
    extras: {
      modelo: item.modeloPadrao ?? "",
      tamanhos: item.tamanhosAceitos.join(", "),
      cores: item.coresAceitas.join(", "),
    },
  };
}

/**
 * Produtos do catálogo para a lista de itens do pedido no modo Fácil: busca
 * por nome direto no banco, com limite. Sem texto devolve os primeiros em
 * ordem alfabética.
 */
export async function searchCatalogoForPick(term: string): Promise<FacilOption[]> {
  const { withDb, organizationId } = await requireModule("catalogo-bordado");
  const text = String(term ?? "")
    .trim()
    .slice(0, 80);

  const rows = await withDb((tx) =>
    tx
      .select({
        id: catalogoBordadoItens.id,
        tipoProduto: catalogoBordadoItens.tipoProduto,
        modeloPadrao: catalogoBordadoItens.modeloPadrao,
        tamanhosAceitos: catalogoBordadoItens.tamanhosAceitos,
        coresAceitas: catalogoBordadoItens.coresAceitas,
        defaultPriceCents: catalogoBordadoItens.defaultPriceCents,
      })
      .from(catalogoBordadoItens)
      .where(
        and(
          eq(catalogoBordadoItens.organizationId, organizationId),
          text ? ilike(catalogoBordadoItens.tipoProduto, `%${escapeLike(text)}%`) : undefined,
        ),
      )
      .orderBy(asc(catalogoBordadoItens.tipoProduto))
      .limit(text ? SEARCH_LIMIT : RECENT_LIMIT),
  );
  return rows.map(toOption);
}

/**
 * Cadastro rápido de produto (nome + preço) de dentro de outro fluxo. Passa
 * pela MESMA `createCatalogoBordadoItem` do cadastro completo — só não navega.
 */
export async function quickCreateCatalogoItem(values: Record<string, string>): Promise<MiniResult> {
  const tipoProduto = String(values.tipoProduto ?? "").trim();
  const formData = new FormData();
  formData.set("tipoProduto", tipoProduto);
  formData.set("defaultPrice", String(values.price ?? ""));
  // Opcionais ("Mais dados"): modelo, tamanhos/cores (listas por vírgula), unidade e dados
  // fiscais. Vazio = padrão do cadastro completo.
  for (const key of CATALOGO_QUICK_KEYS) formData.set(key, String(values[key] ?? ""));

  const result = await createCatalogoBordadoItem({ ok: false }, formData);
  if (!result.ok || !result.id) {
    // O campo do mini-formulário chama-se `price`; a validação, `defaultPriceCents`.
    const { defaultPriceCents, ...rest } = result.errors ?? {};
    return {
      ok: false,
      errors: result.errors
        ? { ...rest, ...(defaultPriceCents ? { price: defaultPriceCents } : {}) }
        : undefined,
      message:
        result.message ?? (result.errors ? undefined : "Não foi possível cadastrar o produto."),
    };
  }

  const [created] = await searchCatalogoByIdForPick(result.id);
  return { ok: true, option: created };
}

async function searchCatalogoByIdForPick(id: string): Promise<FacilOption[]> {
  const { withDb, organizationId } = await requireModule("catalogo-bordado");
  const rows = await withDb((tx) =>
    tx
      .select({
        id: catalogoBordadoItens.id,
        tipoProduto: catalogoBordadoItens.tipoProduto,
        modeloPadrao: catalogoBordadoItens.modeloPadrao,
        tamanhosAceitos: catalogoBordadoItens.tamanhosAceitos,
        coresAceitas: catalogoBordadoItens.coresAceitas,
        defaultPriceCents: catalogoBordadoItens.defaultPriceCents,
      })
      .from(catalogoBordadoItens)
      .where(
        and(
          eq(catalogoBordadoItens.organizationId, organizationId),
          eq(catalogoBordadoItens.id, id),
        ),
      )
      .limit(1),
  );
  return rows.map(toOption);
}
