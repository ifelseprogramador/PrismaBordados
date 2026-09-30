import { describe, expect, it } from "vitest";
import { parseViaCep } from "../cep";
import { formatCep, isValidCep, isValidIbge, isValidUf } from "../fiscal-fields";

describe("parseViaCep", () => {
  it("normaliza a resposta", () => {
    expect(
      parseViaCep({
        logradouro: "Av. Paulista",
        bairro: "Bela Vista",
        localidade: "São Paulo",
        uf: "SP",
        ibge: "3550308",
      }),
    ).toEqual({
      street: "Av. Paulista",
      district: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      ibgeCode: "3550308",
    });
  });
  it("devolve null para CEP inexistente", () => {
    expect(parseViaCep({ erro: true })).toBeNull();
    expect(parseViaCep(null)).toBeNull();
  });
});

describe("fiscal-fields", () => {
  it("valida e formata", () => {
    expect(formatCep("01310100")).toBe("01310-100");
    expect(isValidCep("01310-100")).toBe(true);
    expect(isValidCep("0131")).toBe(false);
    expect(isValidUf("sp")).toBe(true);
    expect(isValidUf("XX")).toBe(false);
    expect(isValidIbge("3550308")).toBe(true);
    expect(isValidIbge("355030")).toBe(false);
  });
});
