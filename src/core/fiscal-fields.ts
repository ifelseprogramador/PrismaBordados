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
