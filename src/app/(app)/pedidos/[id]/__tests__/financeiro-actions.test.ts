import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * A orquestração pedidos↔financeiro (`../financeiro-actions.ts`) chama os
 * dois barrels de módulo — testamos aqui SEM banco, mockando
 * `@/modules/pedidos` e `@/modules/financeiro`, porque este ambiente não
 * tem Postgres disponível (ver docs/decisoes.md). O que importa provar:
 * (1) um recebimento novo cria exatamente um lançamento de `entrada` no
 * valor da DIFERENÇA (não do agregado); (2) a categoria vira
 * `saldo_recebido` quando o pedido fica com saldo zerado, e
 * `adiantamento` caso contrário; (3) se `registerAdiantamento` falhar
 * (validação), nenhum lançamento é criado.
 */
const getPedidoById = vi.fn();
const registerAdiantamento = vi.fn();
const createLancamentoRecord = vi.fn();

vi.mock("@/modules/pedidos", () => ({
  getPedidoById: (...args: unknown[]) => getPedidoById(...args),
  registerAdiantamento: (...args: unknown[]) => registerAdiantamento(...args),
}));

vi.mock("@/modules/financeiro", () => ({
  createLancamentoRecord: (...args: unknown[]) => createLancamentoRecord(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { registrarRecebimentoPedido } = await import("../financeiro-actions");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registrarRecebimentoPedido", () => {
  it("cria um lançamento de entrada 'adiantamento' pela diferença recebida", async () => {
    getPedidoById
      .mockResolvedValueOnce({
        id: "p1",
        number: 10,
        customerName: "Maria",
        adiantamentoCents: 1000,
        saldoCents: 9000,
      })
      .mockResolvedValueOnce({
        id: "p1",
        number: 10,
        customerName: "Maria",
        adiantamentoCents: 4000,
        saldoCents: 6000,
      });
    registerAdiantamento.mockResolvedValue({ ok: true });

    const formData = new FormData();
    const result = await registrarRecebimentoPedido("p1", { ok: false }, formData);

    expect(result).toEqual({ ok: true });
    expect(createLancamentoRecord).toHaveBeenCalledTimes(1);
    expect(createLancamentoRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "entrada",
        categoria: "adiantamento",
        amountCents: 3000,
        referenceType: "pedido",
        referenceId: "p1",
      }),
    );
  });

  it("usa a categoria 'saldo_recebido' quando o recebimento zera o saldo", async () => {
    getPedidoById
      .mockResolvedValueOnce({
        id: "p1",
        number: 10,
        customerName: "Maria",
        adiantamentoCents: 5000,
        saldoCents: 5000,
      })
      .mockResolvedValueOnce({
        id: "p1",
        number: 10,
        customerName: "Maria",
        adiantamentoCents: 10000,
        saldoCents: 0,
      });
    registerAdiantamento.mockResolvedValue({ ok: true });

    await registrarRecebimentoPedido("p1", { ok: false }, new FormData());

    expect(createLancamentoRecord).toHaveBeenCalledWith(
      expect.objectContaining({ categoria: "saldo_recebido", amountCents: 5000 }),
    );
  });

  it("não cria lançamento quando registerAdiantamento falha (validação)", async () => {
    getPedidoById.mockResolvedValueOnce({
      id: "p1",
      number: 10,
      customerName: "Maria",
      adiantamentoCents: 1000,
      saldoCents: 9000,
    });
    registerAdiantamento.mockResolvedValue({ ok: false, message: "inválido" });

    const result = await registrarRecebimentoPedido("p1", { ok: false }, new FormData());

    expect(result.ok).toBe(false);
    expect(createLancamentoRecord).not.toHaveBeenCalled();
  });

  it("não cria lançamento quando o pedido não existe", async () => {
    getPedidoById.mockResolvedValueOnce(null);

    const result = await registrarRecebimentoPedido("inexistente", { ok: false }, new FormData());

    expect(result).toEqual({ ok: false, message: "Pedido não encontrado." });
    expect(registerAdiantamento).not.toHaveBeenCalled();
    expect(createLancamentoRecord).not.toHaveBeenCalled();
  });
});
