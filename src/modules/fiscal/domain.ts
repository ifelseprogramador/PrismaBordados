import type { Cents } from "@/core/money";
import {
  isValidCfop,
  isValidCnae,
  isValidCodigoServico,
  isValidCst,
  isValidNcm,
  isValidOrigem,
} from "@/core/fiscal-fields";
import type {
  FiscalClientePayload,
  FiscalEmitentePayload,
  FiscalItemFiscalPayload,
  FiscalItemPayload,
  FiscalOperacaoTipo,
} from "./provider";

export interface PedidoItemLike {
  catalogoItemId?: string | null;
  produto: string;
  quantity: number | string;
  unitPriceCents: Cents;
  /** Dados fiscais próprios do item (vindos do catálogo, quando há vínculo). */
  fiscal?: FiscalItemFiscalPayload;
}

/**
 * Decide NF-e (peça pronta vendida) vs. NFS-e (serviço de bordado sobre
 * peça trazida pelo cliente) por ITEM do pedido.
 *
 * Decisão (ver docs/decisoes.md, "campo que decide NF-e vs. NFS-e por
 * item"): em vez de adicionar uma coluna nova em `pedido_itens` (o que
 * exigiria `fiscal` conhecer o schema de `pedidos` além da FK de
 * `fiscal_notas`, ou `pedidos` conhecer conceitos fiscais), reaproveita
 * um sinal que já existe: `catalogoItemId`. Um item vinculado a um item
 * de catálogo (`catalogoItemId` preenchido) é uma peça PRONTA que a
 * empresa vende — operação de venda, NF-e. Um item sem vínculo (produto
 * digitado à mão, o cliente trouxe a peça própria para bordar) é
 * SERVIÇO sobre bem de terceiro — NFS-e. Isso já é exatamente a
 * semântica de `catalogoItemId` documentada em
 * `modules/pedidos/schema.ts#pedidoItens` — nenhuma migration nova foi
 * necessária.
 */
export function decideOperacaoTipo(
  item: Pick<PedidoItemLike, "catalogoItemId">,
): FiscalOperacaoTipo {
  return item.catalogoItemId ? "venda" : "servico";
}

/** Item + padrões do emitente: NCM/CFOP caem no padrão; serviço usa LC 116/CNAE/ISS do emitente. */
export function resolverFiscalDoItem(
  item: PedidoItemLike,
  emitente: FiscalEmitentePayload,
): FiscalItemFiscalPayload {
  const f = item.fiscal ?? {};
  if (decideOperacaoTipo(item) === "servico") {
    return {
      codigoServico: f.codigoServico ?? emitente.defaults.codigoServico,
      cnae: f.cnae ?? emitente.defaults.cnae,
      aliquotaIssBps: f.aliquotaIssBps ?? emitente.defaults.aliquotaIssBps,
    };
  }
  return {
    ncm: f.ncm ?? emitente.defaults.ncm,
    cfop: f.cfop ?? emitente.defaults.cfop,
    unidade: f.unidade ?? "UN",
    origem: f.origem ?? "0",
    cst: f.cst,
  };
}

export function buildFiscalItemPayload(
  item: PedidoItemLike,
  emitente: FiscalEmitentePayload,
): FiscalItemPayload {
  return {
    descricao: item.produto,
    quantidade: Number(item.quantity),
    valorUnitarioCents: item.unitPriceCents,
    tipoOperacao: decideOperacaoTipo(item),
    fiscal: resolverFiscalDoItem(item, emitente),
  };
}

export interface SplitItens<T> {
  venda: T[];
  servico: T[];
}

/** Separa os itens de um pedido em dois grupos — um pedido com itens dos
 * dois tipos gera NF-e E NFS-e juntas (ver `schema.ts#fiscalNotas`). */
export function splitItensPorOperacao<T extends Pick<PedidoItemLike, "catalogoItemId">>(
  itens: T[],
): SplitItens<T> {
  const venda: T[] = [];
  const servico: T[] = [];
  for (const item of itens) {
    (decideOperacaoTipo(item) === "venda" ? venda : servico).push(item);
  }
  return { venda, servico };
}

export function calculateItensTotal(itens: PedidoItemLike[]): Cents {
  return itens.reduce(
    (total, item) => total + Math.round(item.unitPriceCents * Number(item.quantity)),
    0,
  );
}

/**
 * Dados do cliente (tomador/destinatário) que o tipo de nota exige.
 * Devolve a lista de pendências em português (vazia = pode emitir).
 * NF-e: documento, endereço completo com IBGE, IE se contribuinte e razão
 * social para PJ. NFS-e: município (UF + IBGE) e CEP do tomador.
 */
export function validarClienteParaNota(
  cliente: FiscalClientePayload,
  itens: Pick<PedidoItemLike, "catalogoItemId">[],
): string[] {
  const tipos = new Set(itens.map(decideOperacaoTipo));
  const e = cliente.enderecoEstruturado ?? {};
  const faltando: string[] = [];

  if (tipos.has("venda")) {
    if (!cliente.documento) faltando.push("CPF/CNPJ (NF-e)");
    if (cliente.tipo === "pj" && !cliente.razaoSocial) faltando.push("razão social (NF-e)");
    if (cliente.indicadorIe === "contribuinte" && !cliente.ie) faltando.push("Inscrição Estadual");
    const campos: [keyof typeof e, string][] = [
      ["cep", "CEP"],
      ["logradouro", "logradouro"],
      ["numero", "número"],
      ["bairro", "bairro"],
      ["municipio", "cidade"],
      ["uf", "UF"],
      ["codigoIbge", "código IBGE"],
    ];
    for (const [k, label] of campos) if (!e[k]) faltando.push(`${label} (NF-e)`);
  } else if (tipos.has("servico")) {
    for (const [k, label] of [
      ["cep", "CEP"],
      ["uf", "UF"],
      ["codigoIbge", "código IBGE"],
    ] as const) {
      if (!e[k]) faltando.push(`${label} (NFS-e)`);
    }
  }
  // Pedido misto (NF-e + NFS-e): as regras de NF-e já cobrem as de NFS-e.
  return faltando;
}

/**
 * Dados do EMITENTE exigidos pelo tipo de nota. NF-e: CNPJ, razão social,
 * IE, regime, série e endereço completo com IBGE. NFS-e: CNPJ, razão social,
 * IM, regime e município (IBGE).
 */
export function validarEmitente(
  emitente: FiscalEmitentePayload,
  itens: Pick<PedidoItemLike, "catalogoItemId">[],
): string[] {
  const tipos = new Set(itens.map(decideOperacaoTipo));
  const e = emitente.endereco;
  const faltando: string[] = [];
  const exige = (ok: unknown, label: string) => {
    if (!ok) faltando.push(label);
  };

  exige(emitente.cnpj, "CNPJ da empresa");
  exige(emitente.razaoSocial, "razão social da empresa");
  exige(emitente.regimeTributario, "regime tributário");
  if (tipos.has("venda")) {
    exige(emitente.ie, "Inscrição Estadual da empresa");
    exige(emitente.serieNota, "série da nota");
    for (const [k, label] of [
      ["cep", "CEP"],
      ["logradouro", "logradouro"],
      ["numero", "número"],
      ["bairro", "bairro"],
      ["municipio", "cidade"],
      ["uf", "UF"],
      ["codigoIbge", "código IBGE"],
    ] as const) {
      exige(e[k], `${label} da empresa`);
    }
  }
  if (tipos.has("servico")) {
    exige(emitente.im, "Inscrição Municipal da empresa");
    exige(e.codigoIbge, "código IBGE da empresa");
  }
  return faltando;
}

/** Dados fiscais dos ITENS já resolvidos com os padrões do emitente. */
export function validarItensParaNota(itens: FiscalItemPayload[]): string[] {
  const faltando = new Set<string>();
  for (const item of itens) {
    const f = item.fiscal;
    const nome = item.descricao;
    if (item.tipoOperacao === "venda") {
      if (!f.ncm || !isValidNcm(f.ncm)) faltando.add(`NCM válido (${nome})`);
      if (!f.cfop || !isValidCfop(f.cfop)) faltando.add(`CFOP válido (${nome})`);
      if (!f.cst || !isValidCst(f.cst)) faltando.add(`CST/CSOSN (${nome})`);
      if (!f.origem || !isValidOrigem(f.origem)) faltando.add(`origem (${nome})`);
    } else {
      if (!f.codigoServico || !isValidCodigoServico(f.codigoServico))
        faltando.add("código do serviço (LC 116) nos padrões fiscais");
      if (f.cnae && !isValidCnae(f.cnae)) faltando.add("CNAE válido nos padrões fiscais");
      if (f.aliquotaIssBps === undefined) faltando.add("alíquota de ISS nos padrões fiscais");
    }
  }
  return [...faltando];
}

/** Colunas de `fiscal_credentials` que formam o emitente (sem segredos). */
export interface EmitenteRow {
  cnpj: string | null;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  ie: string | null;
  im: string | null;
  regimeTributario: string | null;
  serieNota: string | null;
  zip: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  ibgeCode: string | null;
  defaultNcm: string | null;
  defaultCfop: string | null;
  codigoServico: string | null;
  cnae: string | null;
  issRateBps: number | null;
}

export function buildEmitentePayload(row: EmitenteRow | undefined): FiscalEmitentePayload {
  const n = <T>(v: T | null | undefined) => v ?? undefined;
  return {
    cnpj: n(row?.cnpj)?.replace(/\D/g, ""),
    razaoSocial: n(row?.razaoSocial),
    nomeFantasia: n(row?.nomeFantasia),
    ie: n(row?.ie),
    im: n(row?.im),
    regimeTributario: n(row?.regimeTributario) as FiscalEmitentePayload["regimeTributario"],
    serieNota: n(row?.serieNota),
    endereco: {
      cep: n(row?.zip),
      logradouro: n(row?.street),
      numero: n(row?.number),
      complemento: n(row?.complement),
      bairro: n(row?.district),
      municipio: n(row?.city),
      uf: n(row?.state),
      codigoIbge: n(row?.ibgeCode),
      codigoPais: "1058",
    },
    defaults: {
      ncm: n(row?.defaultNcm),
      cfop: n(row?.defaultCfop),
      codigoServico: n(row?.codigoServico),
      cnae: n(row?.cnae),
      aliquotaIssBps: n(row?.issRateBps),
    },
  };
}
