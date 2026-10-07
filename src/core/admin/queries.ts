import "server-only";
import { desc, eq, ilike } from "drizzle-orm";

import type { Database } from "@/core/db";
import { getAuditLogForOrg } from "@/core/admin/audit";
import { getUserDisplayInfoByIds } from "@/core/user-lookup";
import { loginEvents, memberships, organizationModuleSettings, organizations } from "@/db/schema";

export async function listOrganizationsForAdmin(db: Database, search?: string) {
  const term = search?.trim();
  const query = db
    .select({
      id: organizations.id,
      name: organizations.name,
      status: organizations.status,
      billingStatus: organizations.billingStatus,
      nextDueDate: organizations.nextDueDate,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .orderBy(desc(organizations.createdAt));

  return term ? query.where(ilike(organizations.name, `%${term}%`)) : query;
}

/**
 * Esta consulta NÃO calcula contagens de módulo (ex.: quantos clientes ou
 * pedidos a organização tem) — mantém o painel do admin agnóstico de
 * módulo de negócio, mesmo o Prisma já tendo `clientes`/`pedidos`. Uma
 * contagem desse tipo, se um dia for necessária aqui, deveria vir de um
 * `get<Modulo>DashboardSummary()` do próprio módulo (mesmo padrão do
 * dashboard em `app/(app)/page.tsx`), nunca de um import direto do
 * schema de um módulo dentro de `core/admin/`.
 */
export async function getOrganizationForAdmin(db: Database, organizationId: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  if (!org) return null;

  const [members, moduleSettings, audit] = await Promise.all([
    db
      .select({
        id: memberships.id,
        userId: memberships.userId,
        role: memberships.role,
        active: memberships.active,
      })
      .from(memberships)
      .where(eq(memberships.organizationId, organizationId)),
    db
      .select()
      .from(organizationModuleSettings)
      .where(eq(organizationModuleSettings.organizationId, organizationId)),
    getAuditLogForOrg(db, organizationId),
  ]);

  const userIds = [...members.map((m) => m.userId), ...audit.map((a) => a.actorUserId)];
  const displayInfoById = await getUserDisplayInfoByIds(db, userIds);

  return {
    organization: org,
    members: members.map((m) => {
      const info = displayInfoById.get(m.userId);
      return { ...m, email: info?.email ?? null, name: info?.name ?? m.userId };
    }),
    moduleSettings,
    audit: audit.map((a) => ({
      ...a,
      actorName: displayInfoById.get(a.actorUserId)?.name ?? a.actorUserId,
    })),
  };
}

/** Últimos acessos (logins) de toda a plataforma, do mais recente ao mais antigo. */
export async function listLoginEvents(db: Database, limit = 200) {
  return db.select().from(loginEvents).orderBy(desc(loginEvents.createdAt)).limit(limit);
}
