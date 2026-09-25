import "server-only";
import { and, asc, desc, eq, ilike } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { catalogoBordadoItens } from "./schema";

export const CATALOGO_BORDADO_SORT_OPTIONS = {
  tipo_asc: "Tipo de produto (A→Z)",
  tipo_desc: "Tipo de produto (Z→A)",
  preco_desc: "Preço padrão (maior primeiro)",
  preco_asc: "Preço padrão (menor primeiro)",
} as const;
export type CatalogoBordadoSort = keyof typeof CATALOGO_BORDADO_SORT_OPTIONS;

const CATALOGO_BORDADO_ORDER_BY = {
  tipo_asc: asc(catalogoBordadoItens.tipoProduto),
  tipo_desc: desc(catalogoBordadoItens.tipoProduto),
  preco_desc: desc(catalogoBordadoItens.defaultPriceCents),
  preco_asc: asc(catalogoBordadoItens.defaultPriceCents),
} as const;

export async function listCatalogoBordadoItens(options?: {
  search?: string;
  sort?: CatalogoBordadoSort;
}) {
  const { organizationId, withDb } = await withOrg();
  const term = options?.search?.trim();

  return withDb((tx) =>
    tx
      .select()
      .from(catalogoBordadoItens)
      .where(
        and(
          eq(catalogoBordadoItens.organizationId, organizationId),
          term ? ilike(catalogoBordadoItens.tipoProduto, `%${term}%`) : undefined,
        ),
      )
      .orderBy(CATALOGO_BORDADO_ORDER_BY[options?.sort ?? "tipo_asc"]),
  );
}

export async function getCatalogoBordadoItemById(id: string) {
  const { organizationId, withDb } = await withOrg();

  return withDb(async (tx) => {
    const [item] = await tx
      .select()
      .from(catalogoBordadoItens)
      .where(
        and(
          eq(catalogoBordadoItens.id, id),
          eq(catalogoBordadoItens.organizationId, organizationId),
        ),
      )
      .limit(1);
    return item ?? null;
  });
}

/** Para o autocomplete do item de pedido — só o necessário para
 * pré-preencher (ver `modules/pedidos`). */
export async function listCatalogoBordadoItensForSelect() {
  const { organizationId, withDb } = await withOrg();

  return withDb((tx) =>
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
      .where(eq(catalogoBordadoItens.organizationId, organizationId))
      .orderBy(asc(catalogoBordadoItens.tipoProduto)),
  );
}
