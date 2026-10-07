import "server-only";
import { desc, eq, ilike, inArray } from "drizzle-orm";

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

/**
 * Últimos acessos (logins), do mais recente ao mais antigo. Com `organizationId`,
 * só de quem é membro dessa organização (o histórico guarda a pessoa, não a
 * organização: quem saiu da equipe deixa de aparecer na ficha dela).
 */
export async function listLoginEvents(
  db: Database,
  options: { organizationId?: string; limit?: number } = {},
) {
  const { organizationId, limit = 200 } = options;
  return db
    .select()
    .from(loginEvents)
    .where(organizationId ? inArray(loginEvents.userId, membersOf(db, organizationId)) : undefined)
    .orderBy(desc(loginEvents.createdAt))
    .limit(limit);
}

/** Subconsulta: ids das pessoas que são membros da organização. */
export function membersOf(db: Pick<Database, "select">, organizationId: string) {
  return db
    .select({ id: memberships.userId })
    .from(memberships)
    .where(eq(memberships.organizationId, organizationId));
}
