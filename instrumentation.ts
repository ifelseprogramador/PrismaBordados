import type { Instrumentation } from "next";

/**
 * Rede de segurança para erro não tratado — as Server Actions dos
 * módulos de negócio (`clientes`, `pedidos`, `financeiro`, `fiscal`,
 * `catalogo-bordado`) não têm `try/catch` em volta das operações de
 * banco: um erro inesperado (conexão caiu, violação de constraint não
 * prevista, etc.) sobe cru até aqui, em vez de passar pelo
 * `core/logger.ts` estruturado que o resto do app já usa (`core/admin`,
 * `core/live-support`, `core/notifications`, os crons). Sem isso, esse
 * tipo de erro só aparecia como stack trace bruto nos logs do Vercel,
 * sem `requestId`/rota/contexto nenhum amarrado — difícil de cruzar com
 * "qual organização, em qual ação" quando um cliente reporta um erro.
 *
 * `onRequestError` (ver node_modules/next/dist/docs/.../instrumentation.md
 * — Next 16, API nova, não assuma a de treino) é chamado pelo Next.js
 * toda vez que captura um erro de servidor (Server Component, Route
 * Handler OU Server Action — `context.routeType === "action"` cobre
 * exatamente o caso das Server Actions sem `try/catch`), mesmo sem
 * nenhum código de aplicação pedindo. Não substitui os `log.error`
 * explícitos que já existem (aqueles têm contexto de negócio — ex.:
 * `organizationId`, `clienteId` — que este hook não recebe); só garante
 * que NENHUM erro passa em branco.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { logger } = await import("@/core/logger");

  const message = error instanceof Error ? error.message : String(error);
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String((error as { digest: unknown }).digest)
      : undefined;

  logger.error("request.erro_nao_tratado", {
    message,
    digest,
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    routePath: context.routePath,
  });
};
