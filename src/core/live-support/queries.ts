import "server-only";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { requireAdmin } from "@/core/admin-auth";
import type { Database } from "@/core/db";
import { liveSessions, organizations } from "@/db/schema";
import { PENDING_SESSION_TTL_MINUTES } from "./domain";

const OPEN_STATUSES = ["pending", "active"] as const;

/**
 * Marca como `ended` qualquer sessão `pending` mais velha que
 * `PENDING_SESSION_TTL_MINUTES` (`domain.ts`) — chamado antes de toda
 * leitura/decisão abaixo que dependa de "existe pedido pendente", pra um
 * pedido esquecido (ninguém respondeu) não ficar bloqueando o aviso pro
 * usuário, nem impedindo um pedido novo, pra sempre. Sem cron/job
 * separado de propósito: a varredura é barata (poucas linhas, WHERE já
 * filtra) e roda exatamente nos pontos onde o estado "pendente" importa
 * de verdade — nenhuma sessão de negócio nova precisa saber que isso
 * existe.
 */
export async function expireStalePendingSessions(db: Database) {
  await db
    .update(liveSessions)
    .set({ status: "ended", endedAt: new Date(), controlGranted: false })
    .where(
      and(
        eq(liveSessions.status, "pending"),
        lt(
          liveSessions.createdAt,
          sql`now() - interval '1 minute' * ${PENDING_SESSION_TTL_MINUTES}`,
        ),
      ),
    );
}

/** A sessão em aberto (pedida ou já ativa) da organização do usuário logado, se houver. */
export async function getOpenSessionForMyOrg() {
  const { organizationId, withDb } = await withOrg();

  return withDb(async (db) => {
    await expireStalePendingSessions(db);
    const [session] = await db
      .select()
      .from(liveSessions)
      .where(
        and(
          eq(liveSessions.organizationId, organizationId),
          inArray(liveSessions.status, OPEN_STATUSES),
        ),
      )
      .orderBy(desc(liveSessions.createdAt))
      .limit(1);

    return session ?? null;
  });
}

/** Pedidos de suporte que uma organização abriu e ainda esperam um admin
 * aceitar — inbox do dashboard. */
export async function listPendingUserRequestsForAdmin() {
  const { withDb } = await requireAdmin();

  return withDb(async (db) => {
    await expireStalePendingSessions(db);
    return db
      .select({
        sessionId: liveSessions.id,
        organizationId: liveSessions.organizationId,
        organizationName: organizations.name,
      })
      .from(liveSessions)
      .innerJoin(organizations, eq(organizations.id, liveSessions.organizationId))
      .where(and(eq(liveSessions.status, "pending"), eq(liveSessions.initiatedBy, "user")))
      .orderBy(desc(liveSessions.createdAt));
  });
}

export async function getSessionByIdForAdmin(sessionId: string) {
  const { withDb } = await requireAdmin();

  return withDb(async (db) => {
    const [session] = await db
      .select()
      .from(liveSessions)
      .where(eq(liveSessions.id, sessionId))
      .limit(1);
    return session ?? null;
  });
}

/** Sessão em aberto (se houver) de uma organização específica — para a
 * ficha em /admin. */
export async function getOpenSessionForOrgAdmin(organizationId: string) {
  const { withDb } = await requireAdmin();

  return withDb(async (db) => {
    await expireStalePendingSessions(db);
    const [session] = await db
      .select()
      .from(liveSessions)
      .where(
        and(
          eq(liveSessions.organizationId, organizationId),
          inArray(liveSessions.status, OPEN_STATUSES),
        ),
      )
      .orderBy(desc(liveSessions.createdAt))
      .limit(1);

    return session ?? null;
  });
}
