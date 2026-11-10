"use server";

import { CUSTOMER_QUICK_KEYS } from "@/components/facil/mini-fields";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { requireModule } from "@/core/auth";
import { formatDocument } from "@/core/document";
import type { FacilOption, MiniResult } from "@/components/facil/facil-search";
import { createCliente } from "./actions";
import { clientes } from "./schema";

/** Quantos resultados uma busca devolve; sem texto, só os mais recentes. */
const SEARCH_LIMIT = 20;
const RECENT_LIMIT = 8;

/** `%` e `_` digitados pela pessoa não podem virar curinga do ILIKE. */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}

/**
 * Busca de clientes para o modo Fácil (campo de escolha com busca): por nome,
 * telefone ou CPF/CNPJ, direto no banco e com limite — aguenta cadastros
 * enormes. Sem texto devolve os últimos cadastrados.
 */
export async function searchClientesForPick(term: string): Promise<FacilOption[]> {
  const { withDb, organizationId } = await requireModule("clientes");
  const text = String(term ?? "")
    .trim()
    .slice(0, 80);
  const digits = text.replace(/\D/g, "");
  const like = `%${escapeLike(text)}%`;

  const rows = await withDb((tx) =>
    tx
      .select({
        id: clientes.id,
        name: clientes.name,
        phone: clientes.phone,
        document: clientes.document,
      })
      .from(clientes)
      .where(
        and(
          eq(clientes.organizationId, organizationId),
          text
            ? or(
                ilike(clientes.name, like),
                ilike(clientes.phone, like),
                digits ? ilike(clientes.document, `%${digits}%`) : undefined,
              )
            : undefined,
        ),
      )
      .orderBy(text ? asc(clientes.name) : desc(clientes.createdAt))
      .limit(text ? SEARCH_LIMIT : RECENT_LIMIT),
  );

  return rows.map((row) => ({
    value: row.id,
    label: row.name,
    subtitle: row.phone || (row.document ? formatDocument(row.document) : undefined),
  }));
}

/**
 * Cadastro rápido (nome + telefone e, se a pessoa quiser, tipo, CPF/CNPJ e
 * e-mail) de dentro de outro fluxo, ex.: novo
 * pedido. Passa pela MESMA `createCliente` (validação, endereço, log) do
 * cadastro completo — só não navega.
 */
export async function quickCreateCliente(values: Record<string, string>): Promise<MiniResult> {
  const formData = new FormData();
  // Todos os campos do cadastro completo; os de "Mais dados" vazios = não informado.
  for (const key of CUSTOMER_QUICK_KEYS) formData.set(key, String(values[key] ?? ""));
  formData.set("type", values.type === "pj" ? "pj" : "pf");

  const result = await createCliente({ ok: false }, formData);
  if (!result.ok || !result.id) {
    return {
      ok: false,
      errors: result.errors,
      message:
        result.message ?? (result.errors ? undefined : "Não foi possível cadastrar o cliente."),
    };
  }
  return {
    ok: true,
    option: {
      value: result.id,
      label: String(values.name ?? "").trim(),
      subtitle: String(values.phone ?? "").trim() || undefined,
    },
  };
}
