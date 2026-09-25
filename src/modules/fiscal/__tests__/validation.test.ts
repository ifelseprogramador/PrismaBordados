import { describe, expect, it } from "vitest";
import { fiscalCredentialsSchema, parseFiscalCredentialsFormData } from "../validation";

describe("fiscalCredentialsSchema", () => {
  it("aceita todos os campos vazios (organização ainda sem provedor)", () => {
    const result = fiscalCredentialsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.providerSlug).toBeUndefined();
    }
  });

  it("aceita um preenchimento completo", () => {
    const result = fiscalCredentialsSchema.safeParse({
      providerSlug: "",
      apiKey: "chave-secreta",
      cnpj: "12345678000199",
      regimeTributario: "Simples Nacional",
      serieNota: "1",
    });
    expect(result.success).toBe(true);
  });
});

describe("parseFiscalCredentialsFormData", () => {
  it("converte campos vazios para undefined", () => {
    const formData = new FormData();
    formData.set("providerSlug", "");
    formData.set("apiKey", "");
    formData.set("cnpj", "");
    formData.set("regimeTributario", "");
    formData.set("serieNota", "");

    const result = parseFiscalCredentialsFormData(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.providerSlug).toBeUndefined();
      expect(result.data.apiKey).toBeUndefined();
    }
  });
});
