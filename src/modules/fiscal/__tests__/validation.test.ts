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
      cnpj: "11222333000181",
      regimeTributario: "simples_nacional",
      serieNota: "1",
      ncm: undefined,
      defaultNcm: "62179000",
      defaultCfop: "5102",
      codigoServico: "14.01",
      cnae: "1354500",
      issRate: "2,5",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.issRate).toBe(250);
  });

  it("rejeita CNPJ, regime, NCM, CFOP e LC 116 inválidos", () => {
    const r = fiscalCredentialsSchema.safeParse({
      cnpj: "12345678000199",
      regimeTributario: "Simples Nacional",
      defaultNcm: "123",
      defaultCfop: "1102",
      codigoServico: "abc",
      issRate: "150",
    });
    expect(Object.keys(r.error?.flatten().fieldErrors ?? {}).sort()).toEqual([
      "cnpj",
      "codigoServico",
      "defaultCfop",
      "defaultNcm",
      "issRate",
      "regimeTributario",
    ]);
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
