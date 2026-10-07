import { registerModule } from "@/core/registry";
import { registerBackupTable } from "@/core/backup";
import { sql } from "drizzle-orm";
import { pedidoCounters, pedidoItens, pedidos } from "./schema";

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

// `pedido_itens` não tem `organizationId` próprio (a RLS é via join com `pedidos`),
// por isso entra no backup pela tabela-pai (`parent`): os itens de cada pedido da
// organização. Registrado DEPOIS de `pedidos` — a restauração segue esta ordem.
registerBackupTable({
  key: "pedido_itens",
  table: pedidoItens,
  parent: { table: pedidos, foreignKey: "pedidoId" },
  dateColumns: ["createdAt"],
});

// Contador de numeração dos pedidos. Depois de restaurar, nunca deixa o contador
// abaixo do maior número de pedido existente (senão o próximo pedido novo bateria
// no índice único (organização, número)).
registerBackupTable({
  key: "pedido_counters",
  table: pedidoCounters,
  afterRestore: async (db, organizationId) => {
    await db.execute(sql`
      insert into pedido_counters (organization_id, last_number)
      select ${organizationId}::uuid, coalesce(max(number), 0)
      from pedidos where organization_id = ${organizationId}::uuid
      on conflict (organization_id)
      do update set last_number = greatest(pedido_counters.last_number, excluded.last_number)
    `);
  },
});
