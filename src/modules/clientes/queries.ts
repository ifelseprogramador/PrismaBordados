import "server-only";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { clientes } from "./schema";

export const CLIENTE_SORT_OPTIONS = {
  name_asc: "Nome (A→Z)",
  name_desc: "Nome (Z→A)",
  created_desc: "Mais recentes primeiro",
  created_asc: "Mais antigos primeiro",
} as const;
export type ClienteSort = keyof typeof CLIENTE_SORT_OPTIONS;

const CLIENTE_ORDER_BY = {
  name_asc: asc(clientes.name),
  name_desc: desc(clientes.name),
  created_desc: desc(clientes.createdAt),
  created_asc: asc(clientes.createdAt),
} as const;

export async function listClientes(options?: { search?: string; sort?: ClienteSort }) {
  const { organizationId, withDb } = await withOrg();
  const term = options?.search?.trim();

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
      .orderBy(CLIENTE_ORDER_BY[options?.sort ?? "name_asc"]),
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
