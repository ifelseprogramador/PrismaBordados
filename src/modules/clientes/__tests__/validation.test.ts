import { describe, expect, it } from "vitest";
import { clienteSchema } from "../validation";

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
});
