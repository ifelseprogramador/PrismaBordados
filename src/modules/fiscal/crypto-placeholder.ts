import "server-only";

/**
 * Placeholder de "criptografia" para `fiscalCredentials.apiKeyEncrypted`.
 *
 * NUNCA use isto em produção: é só codificação reversível (base64 com um
 * prefixo de versão), suficiente pra não guardar a chave de API em TEXTO
 * PURO durante este MVP local, mas SEM proteção real nenhuma — qualquer
 * um com acesso de leitura ao banco decodifica trivialmente (é
 * `atob`/`btoa`, não uma cifra). Antes de qualquer organização real usar
 * o módulo fiscal em produção, trocar por uma solução de secrets de
 * verdade (ex.: Supabase Vault, um KMS de nuvem, ou um cofre externo tipo
 * Doppler/1Password) — ver docs/decisoes.md,
 * "apiKeyEncrypted: placeholder, não é solução de produção".
 */
const PLACEHOLDER_PREFIX = "b64:";

export function encryptApiKeyPlaceholder(plainText: string): string {
  return PLACEHOLDER_PREFIX + Buffer.from(plainText, "utf8").toString("base64");
}

export function decryptApiKeyPlaceholder(encrypted: string | null | undefined): string | null {
  if (!encrypted || !encrypted.startsWith(PLACEHOLDER_PREFIX)) return null;
  return Buffer.from(encrypted.slice(PLACEHOLDER_PREFIX.length), "base64").toString("utf8");
}
