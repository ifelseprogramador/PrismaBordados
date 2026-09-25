import { describe, expect, it } from "vitest";
import { decryptApiKeyPlaceholder, encryptApiKeyPlaceholder } from "../crypto-placeholder";

describe("crypto-placeholder", () => {
  it("nunca grava o texto puro (codifica antes)", () => {
    const encrypted = encryptApiKeyPlaceholder("minha-chave-secreta");
    expect(encrypted).not.toContain("minha-chave-secreta");
  });

  it("é reversível (round-trip)", () => {
    const encrypted = encryptApiKeyPlaceholder("minha-chave-secreta");
    expect(decryptApiKeyPlaceholder(encrypted)).toBe("minha-chave-secreta");
  });

  it("devolve null para valor vazio/indefinido", () => {
    expect(decryptApiKeyPlaceholder(null)).toBeNull();
    expect(decryptApiKeyPlaceholder(undefined)).toBeNull();
    expect(decryptApiKeyPlaceholder("")).toBeNull();
  });

  it("devolve null para um valor sem o prefixo esperado (nunca decodifica lixo)", () => {
    expect(decryptApiKeyPlaceholder("texto-qualquer")).toBeNull();
  });
});
