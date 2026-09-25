import { describe, expect, it } from "vitest";
import { lancamentoSchema, parseLancamentoFormData } from "../validation";

describe("lancamentoSchema", () => {
  it("aceita um lançamento de saída válido", () => {
    const result = lancamentoSchema.safeParse({
      type: "saida",
      categoria: "compra_material",
      amountCents: 5000,
      date: "2026-09-24",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita valor zero ou negativo", () => {
    expect(
      lancamentoSchema.safeParse({
        type: "saida",
        categoria: "outro",
        amountCents: 0,
        date: "2026-09-24",
      }).success,
    ).toBe(false);
    expect(
      lancamentoSchema.safeParse({
        type: "saida",
        categoria: "outro",
        amountCents: -100,
        date: "2026-09-24",
      }).success,
    ).toBe(false);
  });

  it("exige data", () => {
    const result = lancamentoSchema.safeParse({
      type: "entrada",
      categoria: "venda",
      amountCents: 1000,
      date: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita categoria fora do enum fechado", () => {
    const result = lancamentoSchema.safeParse({
      type: "saida",
      categoria: "categoria-invalida",
      amountCents: 1000,
      date: "2026-09-24",
    });
    expect(result.success).toBe(false);
  });
});

describe("parseLancamentoFormData", () => {
  it("converte o valor em reais digitado para centavos", () => {
    const formData = new FormData();
    formData.set("type", "saida");
    formData.set("categoria", "despesa_fixa");
    formData.set("amount", "150,90");
    formData.set("date", "2026-09-24");

    const result = parseLancamentoFormData(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amountCents).toBe(15090);
    }
  });
});
