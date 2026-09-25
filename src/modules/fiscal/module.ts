import { registerModule } from "@/core/registry";
import { registerBackupTable } from "@/core/backup";
import { fiscalNotas } from "./schema";

registerModule({
  slug: "fiscal",
  label: "Fiscal",
  iconName: "Receipt",
  href: "/fiscal",
  order: 50,
  enabled: true,
  dependsOn: ["pedidos"],
});

registerBackupTable({
  key: "fiscal_notas",
  table: fiscalNotas,
  dateColumns: ["createdAt", "updatedAt"],
});

// `fiscal_credentials` NUNCA entra no backup: guarda `apiKeyEncrypted`
// (mesmo que placeholder, ver `crypto-placeholder.ts`) — um arquivo de
// backup exportável não é o lugar certo pra um segredo, mesmo
// fracamente "criptografado". Ver docs/decisoes.md.
