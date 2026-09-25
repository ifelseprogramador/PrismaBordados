import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { fiscalCredentials, fiscalNotas } from "./schema";

export async function listFiscalNotasByPedido(pedidoId: string) {
  const { organizationId, withDb } = await withOrg();

  return withDb((tx) =>
    tx
      .select()
      .from(fiscalNotas)
      .where(
        and(eq(fiscalNotas.pedidoId, pedidoId), eq(fiscalNotas.organizationId, organizationId)),
      )
      .orderBy(desc(fiscalNotas.createdAt)),
  );
}

/** Nunca devolve `apiKeyEncrypted` — credenciais fiscais nunca chegam a
 * um Client Component (ver `src/modules/README.md`/docs/decisoes.md). */
export async function getFiscalCredentialsSummary() {
  const { organizationId, withDb } = await withOrg();

  return withDb(async (tx) => {
    const [row] = await tx
      .select({
        providerSlug: fiscalCredentials.providerSlug,
        cnpj: fiscalCredentials.cnpj,
        regimeTributario: fiscalCredentials.regimeTributario,
        serieNota: fiscalCredentials.serieNota,
        hasApiKey: fiscalCredentials.apiKeyEncrypted,
      })
      .from(fiscalCredentials)
      .where(eq(fiscalCredentials.organizationId, organizationId))
      .limit(1);

    if (!row) return null;
    return {
      providerSlug: row.providerSlug,
      cnpj: row.cnpj,
      regimeTributario: row.regimeTributario,
      serieNota: row.serieNota,
      hasApiKey: Boolean(row.hasApiKey),
    };
  });
}
