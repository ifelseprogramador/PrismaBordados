/**
 * Prazo que um pedido de suporte `pending` (admin pedindo pra ver a tela,
 * ou usuário chamando o suporte) pode ficar sem resposta antes de ser
 * tratado como esquecido. Sem isso, um pedido que ninguém respondeu
 * (nem "Permitir"/"Recusar", nem o admin cancelar) fica pendurado pra
 * sempre — foi exatamente o que aconteceu numa sessão real, deixada
 * pendente e nunca respondida, mostrando o aviso "Suporte Prisma quer
 * ver sua tela" pra qualquer um que entrasse naquela organização
 * indefinidamente. Ver `queries.ts#expireStalePendingSessions` (efeito
 * de verdade, em SQL) e docs/decisoes.md.
 */
export const PENDING_SESSION_TTL_MINUTES = 10;

/** Pura, testável sem banco — mesma regra que
 * `queries.ts#expireStalePendingSessions` aplica de verdade em SQL. */
export function isPendingSessionExpired(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() > PENDING_SESSION_TTL_MINUTES * 60_000;
}
