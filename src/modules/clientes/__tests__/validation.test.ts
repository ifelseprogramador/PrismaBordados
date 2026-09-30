import { describe, expect, it } from "vitest";
import { clienteSchema, parseClienteFormData, splitClienteInput } from "../validation";

describe("clienteSchema", () => {
  it("aceita um cliente mínimo válido", () => {
    const result = clienteSchema.safeParse({
      name: "Maria da Silva",
      phone: "11999998888",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita nome muito curto", () => {
    const result = clienteSchema.safeParse({ name: "M", phone: "11999998888" });
    expect(result.success).toBe(false);
  });

  it("exige telefone", () => {
    const result = clienteSchema.safeParse({ name: "Maria da Silva", phone: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita CPF/CNPJ inválido", () => {
    const result = clienteSchema.safeParse({
      name: "Maria da Silva",
      phone: "11999998888",
      document: "111.111.111-11",
    });
    expect(result.success).toBe(false);
  });

  it("aceita CPF válido", () => {
    const result = clienteSchema.safeParse({
      name: "Maria da Silva",
      phone: "11999998888",
      document: "52998224725",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita e-mail inválido quando informado", () => {
    const result = clienteSchema.safeParse({
      name: "Maria da Silva",
      phone: "11999998888",
      email: "não-é-email",
    });
    expect(result.success).toBe(false);
  });

  describe("campos fiscais", () => {
    const base = { name: "Maria da Silva", phone: "11999998888" };

    it("exige IE quando contribuinte", () => {
      const r = clienteSchema.safeParse({ ...base, ieIndicator: "contribuinte" });
      expect(r.success).toBe(false);
      expect(r.error?.flatten().fieldErrors.ie).toBeDefined();
    });

    it("não exige IE para não contribuinte e descarta IE informada", () => {
      const r = clienteSchema.parse({ ...base, ie: "123456", ieIndicator: "isento" });
      expect(splitClienteInput(r).cliente.ie).toBeNull();
    });

    it("valida CEP, UF e IBGE", () => {
      const r = clienteSchema.safeParse({ ...base, zip: "123", state: "XX", ibgeCode: "12" });
      const errors = r.error?.flatten().fieldErrors;
      expect(errors?.zip && errors.state && errors.ibgeCode).toBeTruthy();
    });

    it("infere PJ pelo CNPJ e separa o endereço", () => {
      const { cliente, endereco } = splitClienteInput(
        clienteSchema.parse({ ...base, document: "11222333000181", zip: "01310-100", state: "sp" }),
      );
      expect(cliente.type).toBe("pj");
      expect(endereco).toMatchObject({ zip: "01310100", state: "SP" });
    });

    it("sem nenhum campo de endereço não cria endereço", () => {
      expect(splitClienteInput(clienteSchema.parse(base)).endereco).toBeNull();
    });

    it("parseClienteFormData lê os campos novos do FormData", () => {
      const fd = new FormData();
      fd.set("name", "Empresa Ltda");
      fd.set("phone", "1133334444");
      fd.set("legalName", "Empresa Ltda ME");
      fd.set("city", "São Paulo");
      const r = parseClienteFormData(fd);
      expect(r.success && r.data.legalName).toBe("Empresa Ltda ME");
    });
  });
});
