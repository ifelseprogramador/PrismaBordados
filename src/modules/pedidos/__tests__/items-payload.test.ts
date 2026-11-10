import { describe, expect, it } from "vitest";
import { parsePedidoItemsPayload } from "../validation";

const CATALOGO_ID = "3f2b1c4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b";
const item = {
  ref: CATALOGO_ID,
  label: "Camiseta",
  modelo: "Gola V",
  tamanho: "M",
  cor: "branco",
  quantity: 3,
  unitPriceCents: 4500,
};

describe("parsePedidoItemsPayload", () => {
  it("campo ausente ou vazio = sem itens", () => {
    expect(parsePedidoItemsPayload(null)).toEqual({ success: true, data: [] });
    expect(parsePedidoItemsPayload("[]")).toEqual({ success: true, data: [] });
  });

  it("converte para o formato do pedido: ref vira catalogoItemId, label vira produto", () => {
    const result = parsePedidoItemsPayload(JSON.stringify([item]));
    expect(result).toEqual({
      success: true,
      data: [
        {
          catalogoItemId: CATALOGO_ID,
          produto: "Camiseta",
          modelo: "Gola V",
          tamanho: "M",
          cor: "branco",
          quantity: 3,
          unitPriceCents: 4500,
        },
      ],
    });
  });

  it("produto avulso (sem ref) fica sem vínculo de catálogo; campos vazios somem", () => {
    const result = parsePedidoItemsPayload(
      JSON.stringify([{ label: "Toalha trazida", modelo: "", quantity: 1, unitPriceCents: 2000 }]),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].catalogoItemId).toBeUndefined();
      expect(result.data[0].modelo).toBeUndefined();
    }
  });

  it("recusa JSON quebrado, quantidade zero, ref que não é id e lista grande demais", () => {
    expect(parsePedidoItemsPayload("{quebrado").success).toBe(false);
    const zero = parsePedidoItemsPayload(JSON.stringify([{ ...item, quantity: 0 }]));
    expect(zero.success).toBe(false);
    if (!zero.success) expect(zero.error).toContain("Camiseta");
    expect(parsePedidoItemsPayload(JSON.stringify([{ ...item, ref: "não-é-uuid" }])).success).toBe(
      false,
    );
    expect(
      parsePedidoItemsPayload(JSON.stringify(Array.from({ length: 101 }, () => item))).success,
    ).toBe(false);
  });
});
