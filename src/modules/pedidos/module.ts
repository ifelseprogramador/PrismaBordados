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
  // NUNCA incluir orderDate/deliveryDate/paymentDueDate aqui: são
  // colunas `date()` do Drizzle (modo string, "AAAA-MM-DD"), não
  // `timestamp()` — reviver essas como `Date` quebra o insert de
  // restauração ("must be of type string ... Received an instance of
  // Date"). Só timestamp precisa virar `Date` de novo (ver
  // core/backup.ts#reviveDates).
  dateColumns: [
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
