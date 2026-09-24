import type { InferSelectModel } from "drizzle-orm";
import type { pedidoItens, pedidos } from "./schema";

export type Pedido = InferSelectModel<typeof pedidos>;
export type PedidoItem = InferSelectModel<typeof pedidoItens>;
