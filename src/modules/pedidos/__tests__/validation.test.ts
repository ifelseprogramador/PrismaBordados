import { describe, expect, it } from "vitest";
import {
  adiantamentoSchema,
  parseAdiantamentoFormData,
  parsePedidoHeaderFormData,
  parsePedidoItemFormData,
  pedidoHeaderSchema,
  pedidoItemSchema,
} from "../validation";

describe("pedidoHeaderSchema", () => {
  it("aceita um cabeçalho mínimo válido", () => {
    const result = pedidoHeaderSchema.safeParse({
      customerId: "123e4567-e89b-12d3-a456-426614174000",
      orderDate: "2026-09-24",
    });
    expect(result.success).toBe(true);
  });

  it("exige customerId válido (uuid)", () => {
    const result = pedidoHeaderSchema.safeParse({
      customerId: "não-é-uuid",
      orderDate: "2026-09-24",
    });
    expect(result.success).toBe(false);
  });

  it("exige orderDate", () => {
    const result = pedidoHeaderSchema.safeParse({
      customerId: "123e4567-e89b-12d3-a456-426614174000",
      orderDate: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("parsePedidoHeaderFormData", () => {
  it("converte campos vazios opcionais para undefined", () => {
    const formData = new FormData();
    formData.set("customerId", "123e4567-e89b-12d3-a456-426614174000");
    formData.set("orderDate", "2026-09-24");
    formData.set("deliveryDate", "");
    formData.set("deliveryTime", "");

    const result = parsePedidoHeaderFormData(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deliveryDate).toBeUndefined();
      expect(result.data.deliveryTime).toBeUndefined();
    }
  });
});

describe("pedidoItemSchema", () => {
  it("aceita um item com produto texto livre (sem catalogoItemId)", () => {
    const result = pedidoItemSchema.safeParse({
      produto: "Toalha trazida pelo cliente",
      quantity: 1,
      unitPriceCents: 2000,
    });
    expect(result.success).toBe(true);
  });

  it("exige produto", () => {
    const result = pedidoItemSchema.safeParse({ produto: "", quantity: 1, unitPriceCents: 2000 });
    expect(result.success).toBe(false);
  });

  it("exige quantidade positiva", () => {
    const result = pedidoItemSchema.safeParse({
      produto: "Camiseta",
      quantity: 0,
      unitPriceCents: 2000,
    });
    expect(result.success).toBe(false);
  });
});

describe("parsePedidoItemFormData", () => {
  it("converte preço em reais para centavos", () => {
    const formData = new FormData();
    formData.set("produto", "Boné");
    formData.set("quantity", "2");
    formData.set("unitPrice", "35,50");

    const result = parsePedidoItemFormData(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unitPriceCents).toBe(3550);
    }
  });
});

describe("adiantamentoSchema", () => {
  it("rejeita valor negativo", () => {
    const result = adiantamentoSchema.safeParse({ adiantamentoCents: -100 });
    expect(result.success).toBe(false);
  });

  it("aceita adiantamento maior que zero (caso de borda maior que o total é validado em domain.ts, não aqui)", () => {
    const result = adiantamentoSchema.safeParse({ adiantamentoCents: 999999 });
    expect(result.success).toBe(true);
  });
});

describe("parseAdiantamentoFormData", () => {
  it("converte reais para centavos", () => {
    const formData = new FormData();
    formData.set("adiantamento", "100,00");
    const result = parseAdiantamentoFormData(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.adiantamentoCents).toBe(10000);
    }
  });
});
