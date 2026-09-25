import "server-only";
import { lgpdRequestLog } from "@/db/schema/privacy";
import type { Database } from "@/core/db";

/**
 * Registra uma operação sobre dado pessoal de um titular (LGPD, Art. 18 +
 * dever de demonstrar conformidade do Art. 37). Chamar sempre dentro da
 * mesma transação (`tx` de `withOrg()#withDb`) que executa a operação em
 * si — export/anonimização/exclusão e o registro do log nunca devem
 * divergir (um sem o outro). Ver `docs/lgpd-checklist.md`.
 */
export async function recordLgpdAction(
  tx: Database,
  params: {
    organizationId: string;
    performedBy: string;
    action: "export" | "anonymize" | "delete";
    subjectTable: string;
    subjectId: string;
  },
) {
  await tx.insert(lgpdRequestLog).values(params);
}
