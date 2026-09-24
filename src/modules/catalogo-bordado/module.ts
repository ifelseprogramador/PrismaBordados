import { registerModule } from "@/core/registry";
import { registerBackupTable } from "@/core/backup";
import { catalogoBordadoItens } from "./schema";

registerModule({
  slug: "catalogo-bordado",
  label: "Catálogo",
  iconName: "Package",
  href: "/catalogo-bordado",
  order: 20,
  enabled: true,
});

registerBackupTable({
  key: "catalogo_bordado_itens",
  table: catalogoBordadoItens,
  dateColumns: ["createdAt", "updatedAt"],
});
