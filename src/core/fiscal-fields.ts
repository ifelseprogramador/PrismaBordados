/** Utilitários de campos fiscais brasileiros (CEP, UF, IE, IBGE) usados no
 * cadastro de clientes/fornecedores e na emissão de NF-e/NFS-e. */

export const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidUf(value: string): boolean {
  return (UFS as readonly string[]).includes(value.toUpperCase());
}

export function isValidCep(value: string): boolean {
  return onlyDigits(value).length === 8;
}

export function formatCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Código IBGE de município: 7 dígitos. */
export function isValidIbge(value: string): boolean {
  return /^\d{7}$/.test(value);
}

/** IE varia por UF; validação leve: 2 a 14 caracteres alfanuméricos (a SEFAZ
 * confere o dígito verificador na emissão). Aceita "ISENTO" como texto livre. */
export function isValidIe(value: string): boolean {
  const v = value.replace(/[.\-/\s]/g, "");
  return /^[0-9A-Za-z]{2,14}$/.test(v);
}

/** NCM: 8 dígitos. */
export const isValidNcm = (v: string) => /^\d{8}$/.test(onlyDigits(v));
/** CFOP de saída: 4 dígitos começando em 5 (dentro do estado), 6 (fora) ou 7 (exterior). */
export const isValidCfop = (v: string) => /^[567]\d{3}$/.test(onlyDigits(v));
/** CNAE: 7 dígitos. */
export const isValidCnae = (v: string) => /^\d{7}$/.test(onlyDigits(v));
/** Item da lista de serviços (LC 116): "14.01" ou "1401" (alguns municípios usam 6 dígitos). */
export const isValidCodigoServico = (v: string) =>
  /^(\d{1,2}\.\d{2}(\.\d{2})?|\d{4,6})$/.test(v.trim());
/** CST (2 dígitos, regime normal) ou CSOSN (3 dígitos, Simples Nacional). */
export const isValidCst = (v: string) => /^\d{2,3}$/.test(v.trim());
/** Origem da mercadoria: 0 a 8. */
export const isValidOrigem = (v: string) => /^[0-8]$/.test(v.trim());
/** "2,5" (%) → 250 (centésimos de ponto percentual). `null` se inválido. */
export function parsePercentToBps(v: string): number | null {
  const n = Number(v.trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100);
}
export const formatBpsAsPercent = (bps: number) => String(bps / 100).replace(".", ",");

/** Endereço em uma linha para telas/impressão: "Rua X, 10 - Bairro - Cidade/UF - CEP". */
export function formatAddressLine(
  a?: {
    street?: string | null;
    number?: string | null;
    district?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null,
): string {
  if (!a) return "";
  const street = [a.street, a.number].filter(Boolean).join(", ");
  const city = [a.city, a.state].filter(Boolean).join("/");
  return [street, a.district, city, a.zip ? formatCep(a.zip) : ""].filter(Boolean).join(" - ");
}
