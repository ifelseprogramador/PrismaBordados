/**
 * API pública do módulo `catalogo-bordado`. `pedidos` importa daqui
 * (nunca de `schema.ts`/`queries.ts` diretamente) para pré-preencher um
 * item de pedido a partir de um item de catálogo.
 */
export type { CatalogoBordadoItem } from "./schema.types";
export { catalogoBordadoItemSchema, type CatalogoBordadoItemInput } from "./validation";
export {
  listCatalogoBordadoItens,
  getCatalogoBordadoItemById,
  listCatalogoBordadoItensForSelect,
} from "./queries";
export {
  createCatalogoBordadoItem,
  updateCatalogoBordadoItem,
  deleteCatalogoBordadoItem,
} from "./actions";
