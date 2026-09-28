import "@/core/load-modules"; // Route Handlers não passam pelo layout.tsx — importar aqui garante que registerBackupTable de cada módulo já rodou antes de buildOrgBackup iterar sobre BACKUP_TABLES.
import { getActiveOrg, withOrg } from "@/core/auth";
import { buildOrgBackup } from "@/core/backup";

/**
 * Backup completo da organização em JSON — estrutura (colunas + tipos,
 * lidos direto do schema Drizzle) e dados de todas as tabelas de negócio
 * REGISTRADAS via `registerBackupTable` (ver `core/backup.ts` e
 * `core/load-modules.ts`). Módulos registrados: clientes,
 * catalogo_bordado_itens, pedidos.
 */
export async function GET() {
  const [{ log, withDb }, activeOrg] = await Promise.all([withOrg(), getActiveOrg()]);
  log.info("backup.exportar");

  const backup = await withDb((tx) =>
    buildOrgBackup(tx, activeOrg.organizationId, activeOrg.organizationName),
  );

  const filename = `baseerp-backup-${activeOrg.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
