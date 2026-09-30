import { registerModule } from "@/core/registry";
import { registerBackupTable } from "@/core/backup";
import { clientes, clienteEnderecos } from "./schema";

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
  dateColumns: ["anonymizedAt", "createdAt", "updatedAt"],
});

registerBackupTable({
  key: "cliente_enderecos",
  table: clienteEnderecos,
  dateColumns: ["createdAt", "updatedAt"],
});
