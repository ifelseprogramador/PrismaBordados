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
      .select()
      .from(fiscalCredentials)
      .where(eq(fiscalCredentials.organizationId, organizationId))
      .limit(1);

    if (!row) return null;
    // Lista explícita: nunca devolve `apiKeyEncrypted` nem a config interna do provedor.
    return {
      providerSlug: row.providerSlug,
      cnpj: row.cnpj,
      regimeTributario: row.regimeTributario,
      serieNota: row.serieNota,
      razaoSocial: row.razaoSocial,
      nomeFantasia: row.nomeFantasia,
      ie: row.ie,
      im: row.im,
      zip: row.zip,
      street: row.street,
      number: row.number,
      complement: row.complement,
      district: row.district,
      city: row.city,
      state: row.state,
      ibgeCode: row.ibgeCode,
      defaultNcm: row.defaultNcm,
      defaultCfop: row.defaultCfop,
      codigoServico: row.codigoServico,
      cnae: row.cnae,
      issRateBps: row.issRateBps,
      hasApiKey: Boolean(row.apiKeyEncrypted),
    };
  });
}
