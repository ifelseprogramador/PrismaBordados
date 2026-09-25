/**
 * API pública do módulo `fiscal`. A orquestração fina em
 * `app/(app)/pedidos/[id]/fiscal-actions.ts` importa `emitirNotaFiscal`
 * daqui, montando `itens`/`cliente` a partir dos barrels de `pedidos` e
 * `clientes` (este módulo nunca importa nenhum dos dois).
 */
export type { FiscalCredentials, FiscalNota } from "./schema.types";
export type {
  FiscalProvider,
  FiscalOperacaoTipo,
  FiscalItemPayload,
  FiscalClientePayload,
  FiscalEmissaoPayload,
  FiscalEmissaoResultado,
  FiscalConsultaResultado,
  FiscalCancelamentoResultado,
  FiscalArquivo,
  FiscalNotaStatus,
} from "./provider";
export {
  decideOperacaoTipo,
  splitItensPorOperacao,
  buildFiscalItemPayload,
  type PedidoItemLike as FiscalPedidoItemLike,
} from "./domain";
export { fiscalCredentialsSchema, type FiscalCredentialsInput } from "./validation";
export { listFiscalNotasByPedido, getFiscalCredentialsSummary } from "./queries";
export {
  emitirNotaFiscal,
  cancelarNotaFiscal,
  saveFiscalCredentials,
  type EmitirNotaFiscalInput,
} from "./actions";
export { FiscalNotasList } from "./components/fiscal-notas-list";
export { FiscalCredentialsForm } from "./components/fiscal-credentials-form";
