import { describe, expect, it } from "vitest";
import { buildFiscalItemPayload, decideOperacaoTipo, splitItensPorOperacao } from "../domain";

describe("decideOperacaoTipo", () => {
  it("item vinculado a um item de catálogo é venda (NF-e)", () => {
    expect(decideOperacaoTipo({ catalogoItemId: "cat-1" })).toBe("venda");
  });

  it("item sem vínculo de catálogo (peça trazida pelo cliente) é serviço (NFS-e)", () => {
    expect(decideOperacaoTipo({ catalogoItemId: null })).toBe("servico");
    expect(decideOperacaoTipo({ catalogoItemId: undefined })).toBe("servico");
  });
});

describe("buildFiscalItemPayload", () => {
  it("monta o payload do item com o tipo de operação decidido", () => {
    const payload = buildFiscalItemPayload({
      catalogoItemId: "cat-1",
      produto: "Toalha bordada",
      quantity: "2",
      unitPriceCents: 5000,
    });
    expect(payload).toEqual({
      descricao: "Toalha bordada",
      quantidade: 2,
      valorUnitarioCents: 5000,
      tipoOperacao: "venda",
    });
  });
});

describe("splitItensPorOperacao", () => {
  it("separa itens de venda e de serviço", () => {
    const itens = [
      { catalogoItemId: "cat-1", produto: "Toalha", quantity: 1, unitPriceCents: 2000 },
      {
        catalogoItemId: null,
        produto: "Camiseta trazida pelo cliente",
        quantity: 1,
        unitPriceCents: 1500,
      },
    ];
    const { venda, servico } = splitItensPorOperacao(itens);
    expect(venda).toHaveLength(1);
    expect(servico).toHaveLength(1);
    expect(venda[0].produto).toBe("Toalha");
    expect(servico[0].produto).toBe("Camiseta trazida pelo cliente");
  });

  it("pedido só com peça própria do cliente gera só grupo de serviço", () => {
    const itens = [
      { catalogoItemId: null, produto: "Boné do cliente", quantity: 1, unitPriceCents: 1000 },
    ];
    const { venda, servico } = splitItensPorOperacao(itens);
    expect(venda).toHaveLength(0);
    expect(servico).toHaveLength(1);
  });
});
