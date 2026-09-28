import { registerModule } from "@/core/registry";
import { registerBackupTable } from "@/core/backup";
import { financeiroLancamentos } from "./schema";

registerModule({
  slug: "financeiro",
  label: "Financeiro",
  iconName: "Wallet",
  href: "/financeiro",
  order: 40,
  enabled: true,
});

registerBackupTable({
  key: "financeiro_lancamentos",
  table: financeiroLancamentos,
  // `date` é coluna `date()` do Drizzle (modo string, "AAAA-MM-DD"), não
  // `timestamp()` — não entra aqui (ver comentário equivalente em
  // modules/pedidos/module.ts e core/backup.ts#reviveDates).
  dateColumns: ["createdAt", "updatedAt"],
});
