import "server-only";
import { and, asc, eq, ilike } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { catalogoBordadoItens } from "./schema";

export async function listCatalogoBordadoItens(search?: string) {
  const { organizationId, withDb } = await withOrg();
  const term = search?.trim();

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
      .orderBy(asc(catalogoBordadoItens.tipoProduto)),
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
