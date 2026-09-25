"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import type { ActionResult } from "@/core/action-result";
import { catalogoBordadoItens } from "./schema";
import { parseCatalogoBordadoItemFormData } from "./validation";

export interface InsertResult extends ActionResult {
  id?: string;
}

export async function createCatalogoBordadoItem(
  _prevState: ActionResult,
  formData: FormData,
): Promise<InsertResult> {
  const { organizationId, log, withDb } = await withOrg();

  const parsed = parseCatalogoBordadoItemFormData(formData);
  if (!parsed.success) {
    log.warn("catalogo_bordado.criar.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const [item] = await withDb((tx) =>
    tx
      .insert(catalogoBordadoItens)
      .values({ ...parsed.data, organizationId })
      .returning({ id: catalogoBordadoItens.id }),
  );
  log.info("catalogo_bordado.criar.sucesso", { itemId: item.id });

  revalidatePath("/catalogo-bordado");
  return { ok: true, id: item.id };
}

export async function updateCatalogoBordadoItem(
  itemId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { organizationId, log, withDb } = await withOrg();

  const parsed = parseCatalogoBordadoItemFormData(formData);
  if (!parsed.success) {
    log.warn("catalogo_bordado.atualizar.validacao_falhou", {
      itemId,
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const result = await withDb((tx) =>
    tx
      .update(catalogoBordadoItens)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(
        and(
          eq(catalogoBordadoItens.id, itemId),
          eq(catalogoBordadoItens.organizationId, organizationId),
        ),
      )
      .returning({ id: catalogoBordadoItens.id }),
  );

  if (result.length === 0) {
    log.warn("catalogo_bordado.atualizar.nao_encontrado", { itemId });
    return { ok: false, message: "Item de catálogo não encontrado." };
  }

  log.info("catalogo_bordado.atualizar.sucesso", { itemId });
  revalidatePath("/catalogo-bordado");
  return { ok: true };
}

export async function deleteCatalogoBordadoItem(itemId: string): Promise<ActionResult> {
  const { organizationId, log, withDb } = await withOrg();

  await withDb((tx) =>
    tx
      .delete(catalogoBordadoItens)
      .where(
        and(
          eq(catalogoBordadoItens.id, itemId),
          eq(catalogoBordadoItens.organizationId, organizationId),
        ),
      ),
  );

  log.info("catalogo_bordado.remover.sucesso", { itemId });
  revalidatePath("/catalogo-bordado");
  return { ok: true };
}
