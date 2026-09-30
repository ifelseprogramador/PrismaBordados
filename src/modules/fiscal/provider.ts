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

/** Dados fiscais resolvidos de um item (item próprio ou padrão do emitente). */
export interface FiscalItemFiscalPayload {
  ncm?: string;
  cfop?: string;
  unidade?: string;
  /** Origem da mercadoria, 0 a 8. */
  origem?: string;
  /** CST (regime normal) ou CSOSN (Simples Nacional). */
  cst?: string;
  /** NFS-e: item da LC 116, CNAE e alíquota de ISS em centésimos de %. */
  codigoServico?: string;
  cnae?: string;
  aliquotaIssBps?: number;
}

export interface FiscalEmitentePayload {
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  ie?: string;
  im?: string;
  regimeTributario?: "mei" | "simples_nacional" | "lucro_presumido" | "lucro_real";
  serieNota?: string;
  endereco: Partial<FiscalEnderecoPayload>;
  defaults: { ncm?: string; cfop?: string } & Pick<
    FiscalItemFiscalPayload,
    "codigoServico" | "cnae" | "aliquotaIssBps"
  >;
}

export interface FiscalItemPayload {
  descricao: string;
  quantidade: number;
  valorUnitarioCents: Cents;
  fiscal: FiscalItemFiscalPayload;
  /** "venda" = peça pronta vendida (gera NF-e); "servico" = bordado sobre
   * peça trazida pelo cliente (gera NFS-e). Ver `domain.ts#decideOperacaoTipo`
   * para a regra que decide isto a partir de um item de pedido. */
  tipoOperacao: FiscalOperacaoTipo;
}

export interface FiscalEnderecoPayload {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  /** Código IBGE do município (7 dígitos). */
  codigoIbge: string;
  /** Código do país (1058 = Brasil). */
  codigoPais: string;
}

export interface FiscalClientePayload {
  nome: string;
  documento?: string;
  /** Endereço em texto livre (cadastros antigos) — preferir `enderecoEstruturado`. */
  endereco?: string;
  email?: string;
  /** Só dígitos, DDD + número (NF-e: 6 a 14 dígitos). */
  telefone?: string;
  /** NF-e `indFinal`: PF ou não contribuinte de ICMS ⇒ consumidor final. */
  consumidorFinal?: boolean;
  tipo?: "pf" | "pj";
  razaoSocial?: string;
  nomeFantasia?: string;
  indicadorIe?: "contribuinte" | "isento" | "nao_contribuinte";
  ie?: string;
  im?: string;
  enderecoEstruturado?: Partial<FiscalEnderecoPayload>;
}

export interface FiscalEmissaoPayload {
  organizationId: string;
  pedidoId: string;
  pedidoNumber: number;
  emitente: FiscalEmitentePayload;
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
