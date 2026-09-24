import { registerModule } from "@/core/registry";
import { registerBackupTable } from "@/core/backup";
import { clientes } from "./schema";

registerModule({
  slug: "clientes",
  label: "Clientes",
  iconName: "Users",
  href: "/clientes",
  order: 10,
  enabled: true,
});

registerBackupTable({
  key: "clientes",
  table: clientes,
  dateColumns: ["createdAt", "updatedAt"],
});
