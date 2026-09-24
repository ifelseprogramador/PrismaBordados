import "server-only";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { clientes } from "./schema";

export async function listClientes(search?: string) {
  const { organizationId, withDb } = await withOrg();
  const term = search?.trim();

  return withDb((tx) =>
    tx
      .select()
      .from(clientes)
      .where(
        and(
          eq(clientes.organizationId, organizationId),
          term
            ? or(ilike(clientes.name, `%${term}%`), ilike(clientes.phone, `%${term}%`))
            : undefined,
        ),
      )
      .orderBy(asc(clientes.name)),
  );
}

export async function getClienteById(id: string) {
  const { organizationId, withDb } = await withOrg();

  return withDb(async (tx) => {
    const [cliente] = await tx
      .select()
      .from(clientes)
      .where(and(eq(clientes.id, id), eq(clientes.organizationId, organizationId)))
      .limit(1);
    return cliente ?? null;
  });
}

/** Para selects de outros módulos (ex. `pedidos`) — só id/nome, via barrel. */
export async function listClientesForSelect() {
  const { organizationId, withDb } = await withOrg();

  return withDb((tx) =>
    tx
      .select({ id: clientes.id, name: clientes.name, phone: clientes.phone })
      .from(clientes)
      .where(eq(clientes.organizationId, organizationId))
      .orderBy(asc(clientes.name)),
  );
}
