import type { SheetColumn } from "@/core/spreadsheet/columns";
import { UFS, formatCep, onlyDigits } from "@/core/fiscal-fields";
import { formatDocument } from "@/core/document";

/**
 * Colunas da planilha de clientes (importação/exportação). Cabeçalhos em
 * português para quem não é de TI; valores das listas também ("Pessoa
 * física"), convertidos para os códigos internos em `rowToInput`.
 * Puro (sem banco): testável.
 */
export const SHEET_NAME = "Clientes";

export const TYPE_LABELS = { pf: "Pessoa física", pj: "Pessoa jurídica" } as const;
export const IE_LABELS = {
  nao_contribuinte: "Não contribuinte",
  contribuinte: "Contribuinte",
  isento: "Isento",
} as const;

/** O Excel guarda CPF/CEP/IBGE digitados só com números como número e perde o zero à esquerda. */
const padDigits = (len: number) => (v: string) =>
  /^\d+$/.test(v) && v.length < len ? v.padStart(len, "0") : v;
const padDocument = (v: string) =>
  /^\d+$/.test(v) ? (v.length <= 11 ? v.padStart(11, "0") : v.padStart(14, "0")) : v;

export const clienteColumns: SheetColumn[] = [
  {
    key: "name",
    header: "Nome",
    required: true,
    hint: "Nome completo da pessoa ou nome de contato da empresa.",
    example: "Maria da Silva",
    width: 28,
  },
  {
    key: "type",
    header: "Tipo",
    hint: "Pessoa física ou Pessoa jurídica (empresa). Se deixar vazio, o sistema deduz pelo CPF/CNPJ.",
    example: "Pessoa física",
    options: Object.values(TYPE_LABELS),
    aliases: ["tipo de cliente", "pf/pj"],
    width: 18,
  },
  {
    key: "document",
    header: "CPF/CNPJ",
    hint: "Com ou sem pontos e traço. É o que identifica um cliente que já existe.",
    example: "529.982.247-25",
    aliases: ["cpf", "cnpj", "documento", "cpf cnpj"],
    normalize: padDocument,
    width: 20,
  },
  {
    key: "phone",
    header: "Telefone",
    required: true,
    hint: "Com DDD. Pode ser celular/WhatsApp.",
    example: "(11) 99999-8888",
    aliases: ["celular", "whatsapp", "fone"],
    width: 18,
  },
  {
    key: "email",
    header: "E-mail",
    hint: "Para enviar documentos ao cliente.",
    example: "maria@email.com",
    aliases: ["email"],
    width: 26,
  },
  {
    key: "legalName",
    header: "Razão social",
    hint: "Só para empresa: nome oficial, como no CNPJ.",
    example: "Maria Bordados Ltda",
    width: 26,
  },
  {
    key: "tradeName",
    header: "Nome fantasia",
    hint: "Só para empresa.",
    example: "Maria Bordados",
    width: 22,
  },
  {
    key: "ieIndicator",
    header: "Contribuinte de ICMS",
    hint: "Para nota fiscal. Em dúvida, deixe vazio (vale 'Não contribuinte').",
    example: "Não contribuinte",
    options: Object.values(IE_LABELS),
    aliases: ["contribuinte", "indicador de ie"],
    width: 22,
  },
  {
    key: "ie",
    header: "Inscrição Estadual",
    hint: "Só se for contribuinte de ICMS.",
    example: "123456789",
    aliases: ["ie"],
    width: 20,
  },
  {
    key: "im",
    header: "Inscrição Municipal",
    hint: "Para nota de serviço, quando o cliente tiver.",
    example: "98765",
    aliases: ["im"],
    width: 20,
  },
  {
    key: "zip",
    header: "CEP",
    hint: "8 números.",
    example: "01310-100",
    normalize: padDigits(8),
    width: 12,
  },
  {
    key: "street",
    header: "Logradouro",
    hint: "Rua, avenida…",
    example: "Av. Paulista",
    aliases: ["rua", "endereco", "endereço"],
    width: 28,
  },
  {
    key: "number",
    header: "Número",
    hint: "Número do endereço.",
    example: "1000",
    aliases: ["numero"],
    width: 10,
  },
  { key: "complement", header: "Complemento", hint: "Apto, sala…", example: "Sala 12", width: 16 },
  { key: "district", header: "Bairro", hint: "", example: "Bela Vista", width: 18 },
  {
    key: "city",
    header: "Cidade",
    hint: "",
    example: "São Paulo",
    aliases: ["municipio", "município"],
    width: 18,
  },
  {
    key: "state",
    header: "UF",
    hint: "Sigla do estado.",
    example: "SP",
    options: [...UFS],
    aliases: ["estado"],
    width: 6,
  },
  {
    key: "ibgeCode",
    header: "Código IBGE",
    hint: "7 números, exigido na nota fiscal. Se deixar vazio, pode ser completado depois.",
    example: "3550308",
    aliases: ["ibge", "codigo ibge"],
    normalize: padDigits(7),
    width: 12,
  },
];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Aceita o rótulo da lista ("Pessoa física"), a sigla ("pf") e variações simples. */
export function parseType(v: string | undefined): "pf" | "pj" | undefined | "invalid" {
  if (!v) return undefined;
  const n = norm(v);
  if (["pf", "pessoa fisica", "fisica", "f"].includes(n)) return "pf";
  if (["pj", "pessoa juridica", "juridica", "empresa", "j"].includes(n)) return "pj";
  return "invalid";
}

export function parseIeIndicator(
  v: string | undefined,
): "contribuinte" | "isento" | "nao_contribuinte" | undefined | "invalid" {
  if (!v) return undefined;
  const n = norm(v);
  if (["nao contribuinte", "nao", "nao_contribuinte", "9"].includes(n)) return "nao_contribuinte";
  if (["contribuinte", "sim", "1"].includes(n)) return "contribuinte";
  if (["isento", "2"].includes(n)) return "isento";
  return "invalid";
}

/** Valores lidos da planilha → entrada de `clienteSchema` (ou mensagem de erro de lista). */
export function rowToInput(
  values: Record<string, string>,
): { input: Record<string, string | undefined> } | { error: string } {
  const type = parseType(values.type);
  if (type === "invalid") return { error: 'Tipo deve ser "Pessoa física" ou "Pessoa jurídica".' };
  const ie = parseIeIndicator(values.ieIndicator);
  if (ie === "invalid") {
    return {
      error: 'Contribuinte de ICMS deve ser "Não contribuinte", "Contribuinte" ou "Isento".',
    };
  }
  const input: Record<string, string | undefined> = { ...values, type, ieIndicator: ie };
  if (input.state) input.state = input.state.toUpperCase();
  for (const k of Object.keys(input)) if (input[k] === "") input[k] = undefined;
  return { input };
}

/** Só dígitos do documento: chave para saber se o cliente já existe. */
export const documentKey = (doc: string | null | undefined) => (doc ? onlyDigits(doc) : "");

/** Cliente (+ endereço principal) → linha da planilha, no mesmo formato do modelo. */
export function clienteToRow(c: {
  type: "pf" | "pj";
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  legalName: string | null;
  tradeName: string | null;
  ieIndicator: "contribuinte" | "isento" | "nao_contribuinte";
  ie: string | null;
  im: string | null;
  endereco?: {
    zip: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    district: string | null;
    city: string | null;
    state: string | null;
    ibgeCode: string | null;
  } | null;
}): Record<string, string> {
  const e = c.endereco;
  return {
    name: c.name,
    type: TYPE_LABELS[c.type],
    document: c.document ? formatDocument(c.document) : "",
    phone: c.phone ?? "",
    email: c.email ?? "",
    legalName: c.legalName ?? "",
    tradeName: c.tradeName ?? "",
    ieIndicator: IE_LABELS[c.ieIndicator],
    ie: c.ie ?? "",
    im: c.im ?? "",
    zip: e?.zip ? formatCep(e.zip) : "",
    street: e?.street ?? "",
    number: e?.number ?? "",
    complement: e?.complement ?? "",
    district: e?.district ?? "",
    city: e?.city ?? "",
    state: e?.state ?? "",
    ibgeCode: e?.ibgeCode ?? "",
  };
}
