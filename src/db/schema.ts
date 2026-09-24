/**
 * Ponto único que o drizzle-kit lê para gerar migrations. Reexporta o
 * schema de cada peça de fundação — nunca declare tabelas aqui
 * diretamente.
 *
 * Os módulos de negócio do vertical bordados entram abaixo, na ordem de
 * dependência de FKs: `clientes`/`catalogo-bordado` primeiro (sem
 * dependência de outro módulo), `pedidos` por último (referencia os
 * dois).
 */

export * from "./schema/tenancy";
export * from "./schema/live-support";
export * from "./schema/backup";
export * from "./schema/notifications";
export * from "@/modules/clientes/schema";
export * from "@/modules/catalogo-bordado/schema";
export * from "@/modules/pedidos/schema";
