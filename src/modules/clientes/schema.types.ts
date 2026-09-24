import type { InferSelectModel } from "drizzle-orm";
import type { clientes } from "./schema";

export type Cliente = InferSelectModel<typeof clientes>;
