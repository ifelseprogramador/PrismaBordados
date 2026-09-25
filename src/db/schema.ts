/**
 * Ponto único que o drizzle-kit lê para gerar migrations. Reexporta o
 * schema de cada peça de fundação — nunca declare tabelas aqui
 * diretamente.
 *
 * Os módulos de negócio do vertical bordados entram abaixo, na ordem de
 * dependência de FKs: `clientes`/`catalogo-bordado` primeiro (sem
 * dependência de outro módulo), `pedidos` na sequência (referencia os
 * dois), `financeiro` sem FK pra nenhum módulo (referenceId solto, ver
 * docs/decisoes.md), `fiscal` por último (`fiscal_notas` referencia
 * `pedidos`).
 */

export * from "./schema/tenancy";
export * from "./schema/live-support";
export * from "./schema/backup";
export * from "./schema/notifications";
export * from "@/modules/clientes/schema";
export * from "@/modules/catalogo-bordado/schema";
export * from "@/modules/pedidos/schema";
export * from "@/modules/financeiro/schema";
export * from "@/modules/fiscal/schema";
