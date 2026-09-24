import type { InferSelectModel } from "drizzle-orm";
import type { catalogoBordadoItens } from "./schema";

export type CatalogoBordadoItem = InferSelectModel<typeof catalogoBordadoItens>;
