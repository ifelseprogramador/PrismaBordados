import type { InferSelectModel } from "drizzle-orm";
import type { financeiroLancamentos } from "./schema";

export type FinanceiroLancamento = InferSelectModel<typeof financeiroLancamentos>;
