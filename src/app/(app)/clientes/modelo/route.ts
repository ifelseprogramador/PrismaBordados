import { withOrg } from "@/core/auth";
import { buildTemplate } from "@/core/spreadsheet/xlsx";
import { SHEET_NAME, clienteColumns } from "@/modules/clientes/spreadsheet";

/** Modelo em branco para importar clientes (aba de instruções + listas suspensas). */
export async function GET() {
  await withOrg();
  const file = await buildTemplate({
    sheetName: SHEET_NAME,
    title: "Modelo de importação de clientes",
    columns: clienteColumns,
  });
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modelo-clientes.xlsx"',
    },
  });
}
