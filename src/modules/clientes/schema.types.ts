import type { InferSelectModel } from "drizzle-orm";
import type { clientes, clienteEnderecos } from "./schema";

export type Cliente = InferSelectModel<typeof clientes>;

export type ClienteEndereco = InferSelectModel<typeof clienteEnderecos>;
/** Cliente com o endereço principal (quando existe) — usado pelo form e pela emissão fiscal. */
export type ClienteComEndereco = Cliente & { endereco: ClienteEndereco | null };
