import type { Cents } from "@/core/money";

/**
 * Interface `FiscalProvider` — ÚNICO ponto de contato que o resto do
 * sistema tem com emissão fiscal. Nenhuma implementação concreta de
 * provedor (Focus NFe, PlugNotas, eNotas, Nuvem Fiscal, NFE.io, ...)
 * entra nesta fase — decisão EXPLICITAMENTE ADIADA pelo usuário (ver
 * docs/decisoes.md, "provedor fiscal em aberto"). Todo tipo aqui é
 * definido em termos do domínio fiscal brasileiro genérico (itens,
 * cliente, valores, tipo de operação), nunca em termos do formato de
 * requisição/resposta de uma API de provedor específica — isso é
 * trabalho da implementação concreta (futura), que traduz
 * `FiscalEmissaoPayload` pro formato daquele provedor.
 */

export type FiscalOperacaoTipo = "venda" | "servico";

export interface FiscalItemPayload {
  descricao: string;
  quantidade: number;
  valorUnitarioCents: Cents;
  /** "venda" = peça pronta vendida (gera NF-e); "servico" = bordado sobre
   * peça trazida pelo cliente (gera NFS-e). Ver `domain.ts#decideOperacaoTipo`
   * para a regra que decide isto a partir de um item de pedido. */
  tipoOperacao: FiscalOperacaoTipo;
}

export interface FiscalClientePayload {
  nome: string;
  documento?: string;
  endereco?: string;
  email?: string;
}

export interface FiscalEmissaoPayload {
  organizationId: string;
  pedidoId: string;
  pedidoNumber: number;
  cliente: FiscalClientePayload;
  itens: FiscalItemPayload[];
  valorTotalCents: Cents;
}

export type FiscalNotaStatus = "pendente" | "emitida" | "erro" | "cancelada";

export interface FiscalEmissaoResultado {
  status: FiscalNotaStatus;
  providerNotaId?: string;
  xmlUrl?: string;
  pdfUrl?: string;
  errorMessage?: string;
}

export interface FiscalConsultaResultado {
  status: FiscalNotaStatus;
  xmlUrl?: string;
  pdfUrl?: string;
  errorMessage?: string;
}

export interface FiscalCancelamentoResultado {
  ok: boolean;
  errorMessage?: string;
}

export interface FiscalArquivo {
  url: string;
}

export interface FiscalProvider {
  emitirNFe(payload: FiscalEmissaoPayload): Promise<FiscalEmissaoResultado>;
  emitirNFSe(payload: FiscalEmissaoPayload): Promise<FiscalEmissaoResultado>;
  consultar(notaId: string): Promise<FiscalConsultaResultado>;
  cancelar(notaId: string, motivo: string): Promise<FiscalCancelamentoResultado>;
  baixarPdf(notaId: string): Promise<FiscalArquivo>;
  baixarXml(notaId: string): Promise<FiscalArquivo>;
}
