import { registerModule } from "@/core/registry";
import { registerBackupTable } from "@/core/backup";
import { pedidos } from "./schema";

registerModule({
  slug: "pedidos",
  label: "Pedidos",
  iconName: "ClipboardList",
  href: "/pedidos",
  order: 30,
  enabled: true,
  dependsOn: ["clientes", "catalogo-bordado"],
});

registerBackupTable({
  key: "pedidos",
  table: pedidos,
  dateColumns: [
    "orderDate",
    "deliveryDate",
    "approvedAt",
    "startedAt",
    "readyAt",
    "deliveredAt",
    "cancelledAt",
    "createdAt",
    "updatedAt",
  ],
});

// `pedido_itens` não tem `organizationId` próprio (RLS via join com
// `pedidos`, ver schema.ts) — o backup por organização hoje só cobre
// tabelas com `organizationId` direto (ver core/backup.ts); os itens
// ficam de fora do backup por enquanto, registrado como limitação
// conhecida em docs/decisoes.md.
