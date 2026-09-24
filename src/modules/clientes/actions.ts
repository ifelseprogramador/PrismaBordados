"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import type { ActionResult } from "@/core/action-result";
import { clientes } from "./schema";
import { parseClienteFormData } from "./validation";

export async function createCliente(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { organizationId, log, withDb } = await withOrg();

  const parsed = parseClienteFormData(formData);
  if (!parsed.success) {
    log.warn("clientes.criar.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  await withDb((tx) => tx.insert(clientes).values({ ...parsed.data, organizationId }));
  log.info("clientes.criar.sucesso");

  revalidatePath("/clientes");
  return { ok: true };
}

export async function updateCliente(
  clienteId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { organizationId, log, withDb } = await withOrg();

  const parsed = parseClienteFormData(formData);
  if (!parsed.success) {
    log.warn("clientes.atualizar.validacao_falhou", {
      clienteId,
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const result = await withDb((tx) =>
    tx
      .update(clientes)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(clientes.id, clienteId), eq(clientes.organizationId, organizationId)))
      .returning({ id: clientes.id }),
  );

  if (result.length === 0) {
    log.warn("clientes.atualizar.nao_encontrado", { clienteId });
    return { ok: false, message: "Cliente não encontrado." };
  }

  log.info("clientes.atualizar.sucesso", { clienteId });
  revalidatePath("/clientes");
  return { ok: true };
}

export async function deleteCliente(clienteId: string): Promise<ActionResult> {
  const { organizationId, log, withDb } = await withOrg();

  await withDb((tx) =>
    tx
      .delete(clientes)
      .where(and(eq(clientes.id, clienteId), eq(clientes.organizationId, organizationId))),
  );

  log.info("clientes.remover.sucesso", { clienteId });
  revalidatePath("/clientes");
  return { ok: true };
}
