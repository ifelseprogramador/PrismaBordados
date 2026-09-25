import { describe, expect, it } from "vitest";
import { runCancelamento, runEmissaoParaPedido } from "../run-emissao";
import { resolveFiscalProvider } from "../resolve-provider";
import { FakeFiscalProvider } from "./provider.fake";

const CLIENTE = { nome: "Maria Bordados" };

describe("runEmissaoParaPedido", () => {
  it("emite só NF-e quando todos os itens são de venda (catálogo)", async () => {
    const provider = new FakeFiscalProvider();
    const resultados = await runEmissaoParaPedido(
      {
        organizationId: "org-1",
        pedidoId: "pedido-1",
        pedidoNumber: 10,
        cliente: CLIENTE,
        itens: [{ catalogoItemId: "cat-1", produto: "Toalha", quantity: 2, unitPriceCents: 3000 }],
      },
      provider,
    );

    expect(resultados).toHaveLength(1);
    expect(resultados[0].tipo).toBe("nfe");
    expect(resultados[0].resultado.status).toBe("emitida");
    expect(provider.emitidas).toHaveLength(1);
  });

  it("emite NF-e E NFS-e juntas quando o pedido tem itens dos dois tipos", async () => {
    const provider = new FakeFiscalProvider();
    const resultados = await runEmissaoParaPedido(
      {
        organizationId: "org-1",
        pedidoId: "pedido-1",
        pedidoNumber: 10,
        cliente: CLIENTE,
        itens: [
          { catalogoItemId: "cat-1", produto: "Toalha", quantity: 1, unitPriceCents: 3000 },
          {
            catalogoItemId: null,
            produto: "Camiseta do cliente",
            quantity: 1,
            unitPriceCents: 1500,
          },
        ],
      },
      provider,
    );

    expect(resultados.map((r) => r.tipo).sort()).toEqual(["nfe", "nfse"]);
    expect(resultados.every((r) => r.resultado.status === "emitida")).toBe(true);
  });

  it("captura erro do provider sem lançar — vira status 'erro'", async () => {
    const provider = new FakeFiscalProvider();
    provider.throwOn.emitirNFe = true;

    const resultados = await runEmissaoParaPedido(
      {
        organizationId: "org-1",
        pedidoId: "pedido-1",
        pedidoNumber: 10,
        cliente: CLIENTE,
        itens: [{ catalogoItemId: "cat-1", produto: "Toalha", quantity: 1, unitPriceCents: 3000 }],
      },
      provider,
    );

    expect(resultados[0].resultado.status).toBe("erro");
    expect(resultados[0].resultado.errorMessage).toContain("Falha simulada");
  });

  it("provider 'não configurado' (sem providerSlug) devolve erro amigável, sem lançar", async () => {
    const provider = resolveFiscalProvider(null);

    const resultados = await runEmissaoParaPedido(
      {
        organizationId: "org-1",
        pedidoId: "pedido-1",
        pedidoNumber: 10,
        cliente: CLIENTE,
        itens: [{ catalogoItemId: "cat-1", produto: "Toalha", quantity: 1, unitPriceCents: 3000 }],
      },
      provider,
    );

    expect(resultados[0].resultado.status).toBe("erro");
    expect(resultados[0].resultado.errorMessage).toMatch(/nenhum provedor/i);
  });
});

describe("runCancelamento", () => {
  it("cancela com sucesso via o provider fake", async () => {
    const provider = new FakeFiscalProvider();
    const resultado = await runCancelamento("fake-nota-1", "Cliente desistiu", provider);
    expect(resultado.ok).toBe(true);
    expect(provider.cancelamentos).toEqual([{ notaId: "fake-nota-1", motivo: "Cliente desistiu" }]);
  });

  it("recusa cancelar nota sem providerNotaId, sem chamar o provider", async () => {
    const provider = new FakeFiscalProvider();
    const resultado = await runCancelamento(null, "motivo qualquer", provider);
    expect(resultado.ok).toBe(false);
    expect(provider.cancelamentos).toHaveLength(0);
  });

  it("captura erro do provider ao cancelar sem lançar", async () => {
    const provider = new FakeFiscalProvider();
    provider.throwOn.cancelar = true;
    const resultado = await runCancelamento("fake-nota-1", "motivo", provider);
    expect(resultado.ok).toBe(false);
    expect(resultado.errorMessage).toContain("Falha simulada");
  });
});
