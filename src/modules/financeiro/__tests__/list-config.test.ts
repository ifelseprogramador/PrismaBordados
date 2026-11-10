import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/core/auth", () => ({ requireModule: vi.fn() }));

import { parseLancamentoListParams } from "../list-config";

describe("parseLancamentoListParams", () => {
  it("lê tipo, categoria, período, busca e ordem", () => {
    const o = parseLancamentoListParams({
      q: "linha",
      tipo: "saida",
      categoria: "compra_material",
      periodo: "mes",
      sort: "amount_desc",
    });
    expect(o).toMatchObject({
      search: "linha",
      type: "saida",
      categoria: "compra_material",
      sort: "amount_desc",
    });
    expect(o.since).toBeInstanceOf(Date);
  });

  it("ignora categoria/tipo inválidos e respeita os links do painel", () => {
    const o = parseLancamentoListParams({ tipo: "x", categoria: "y" });
    expect(o.type).toBeUndefined();
    expect(o.categoria).toBeUndefined();
    expect(parseLancamentoListParams({ previsao: "30dias" }).futuras).toBe(true);
    expect(parseLancamentoListParams({ month: "2026-11" }).month).toBe("2026-11");
  });
});
