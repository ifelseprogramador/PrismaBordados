import type { InferSelectModel } from "drizzle-orm";
import type { fiscalCredentials, fiscalNotas } from "./schema";

export type FiscalCredentials = InferSelectModel<typeof fiscalCredentials>;
export type FiscalNota = InferSelectModel<typeof fiscalNotas>;
