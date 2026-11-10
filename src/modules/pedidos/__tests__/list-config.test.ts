import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/core/auth", () => ({ requireModule: vi.fn() }));

import { parsePedidoListParams } from "../list-config";

describe("parsePedidoListParams", () => {
  it("lê busca, pagamento, período e ordem da URL", () => {
    const o = parsePedidoListParams({
      q: "ana",
      pagamento: "atrasado",
      periodo: "7d",
      sort: "due_asc",
    });
    expect(o.search).toBe("ana");
    expect(o.pagamento).toBe("atrasado");
    expect(o.since).toBeInstanceOf(Date);
    expect(o.sort).toBe("due_asc");
  });

  it("ignora valores inválidos", () => {
    const o = parsePedidoListParams({ pagamento: "x", periodo: "y", sort: "z", status: "nada" });
    expect(o.pagamento).toBeUndefined();
    expect(o.since).toBeUndefined();
    expect(o.sort).toBeUndefined();
    expect(o.status).toBeUndefined();
  });

  it("status=aberto vira o conjunto em aberto; previsão sobrepõe o status", () => {
    expect(parsePedidoListParams({ status: "aberto" }).statusIn).toBeDefined();
    const p = parsePedidoListParams({ status: "pronto", previsao: "30dias" });
    expect(p.vencimentoProximos30Dias).toBe(true);
    expect(p.status).toBeUndefined();
  });
});
