/**
 * API pública do módulo `clientes`. Outros módulos (ex. `pedidos`) devem
 * importar daqui, nunca de `schema.ts`/`queries.ts` diretamente — exceção
 * documentada em docs/decisoes.md: `schema.ts` de outro módulo pode ser
 * importado só por outro `schema.ts` (nunca por `queries`/`actions`/
 * `components`), porque o Drizzle exige o objeto `pgTable` real para
 * declarar uma foreign key.
 */
export type { Cliente } from "./schema.types";
export { clienteSchema, type ClienteInput } from "./validation";
export { listClientes, getClienteById, listClientesForSelect } from "./queries";
export { createCliente, updateCliente, deleteCliente } from "./actions";
