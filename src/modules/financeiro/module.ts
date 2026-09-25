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
  dateColumns: ["date", "createdAt", "updatedAt"],
});
