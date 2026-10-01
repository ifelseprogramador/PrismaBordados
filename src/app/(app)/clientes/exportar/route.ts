import { and, asc, eq, isNull } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { recordLgpdAction } from "@/core/audit-log";
import { toCsv } from "@/core/csv";
import { buildExport } from "@/core/spreadsheet/xlsx";
import { clienteEnderecos, clientes } from "@/modules/clientes/schema";
import { SHEET_NAME, clienteColumns, clienteToRow } from "@/modules/clientes/spreadsheet";

/**
 * Exporta todos os clientes (menos os anonimizados) no MESMO formato do
 * modelo de importação — dá para editar na planilha e importar de volta.
 * `?formato=csv` devolve CSV. Contém dado pessoal: a exportação fica
 * registrada no log de LGPD (uma linha por exportação, `subject_id` = a
 * própria organização).
 */
export async function GET(request: Request) {
  const { organizationId, userId, withDb } = await withOrg();
  const asCsv = new URL(request.url).searchParams.get("formato") === "csv";

  const rows = await withDb(async (tx) => {
    const data = await tx
      .select({ c: clientes, e: clienteEnderecos })
      .from(clientes)
      .leftJoin(
        clienteEnderecos,
        and(eq(clienteEnderecos.clienteId, clientes.id), eq(clienteEnderecos.kind, "principal")),
      )
      .where(and(eq(clientes.organizationId, organizationId), isNull(clientes.anonymizedAt)))
      .orderBy(asc(clientes.name));
    await recordLgpdAction(tx, {
      organizationId,
      performedBy: userId,
      action: "export",
      subjectTable: "clientes",
      subjectId: organizationId,
    });
    return data.map(({ c, e }) => clienteToRow({ ...c, endereco: e }));
  });

  const stamp = new Date().toISOString().slice(0, 10);
  if (asCsv) {
    const headers = clienteColumns.map((c) => c.header);
    const csv = toCsv(
      rows.map((r) => Object.fromEntries(clienteColumns.map((c) => [c.header, r[c.key] ?? ""]))),
      headers,
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="clientes-${stamp}.csv"`,
      },
    });
  }

  const file = await buildExport({ sheetName: SHEET_NAME, columns: clienteColumns, rows });
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="clientes-${stamp}.xlsx"`,
    },
  });
}
