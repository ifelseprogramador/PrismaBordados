import { isValidCep, onlyDigits } from "./fiscal-fields";

export interface CepResult {
  street: string;
  district: string;
  city: string;
  state: string;
  ibgeCode: string;
}

/** Normaliza a resposta do ViaCEP; `null` se o CEP não existe. */
export function parseViaCep(data: unknown): CepResult | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.erro) return null;
  return {
    street: String(d.logradouro ?? ""),
    district: String(d.bairro ?? ""),
    city: String(d.localidade ?? ""),
    state: String(d.uf ?? ""),
    ibgeCode: String(d.ibge ?? ""),
  };
}

/** Consulta o ViaCEP (dado público, sem chave). Nunca lança: falha de rede
 * ou CEP inexistente devolvem `null` e o usuário digita manualmente. */
export async function lookupCep(cep: string): Promise<CepResult | null> {
  if (!isValidCep(cep)) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${onlyDigits(cep)}/json/`, {
      signal: AbortSignal.timeout(4000),
      cache: "force-cache",
    });
    if (!res.ok) return null;
    return parseViaCep(await res.json());
  } catch {
    return null;
  }
}
