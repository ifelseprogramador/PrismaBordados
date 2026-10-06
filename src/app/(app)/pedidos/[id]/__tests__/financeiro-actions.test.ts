import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * A orquestração pedidos↔financeiro (`../financeiro-actions.ts`) grava o
 * adiantamento e o lançamento na MESMA transação — testamos aqui SEM banco,
 * mockando `@/core/auth` e os dois barrels de módulo (este ambiente não tem
 * Postgres). O que importa provar:
 * (1) um recebimento novo cria exatamente um lançamento de `entrada` no
 *     valor da DIFERENÇA (não do agregado), na MESMA `tx` do adiantamento;
 * (2) a categoria vira `saldo_recebido` quando o saldo zera, `adiantamento`
 *     caso contrário;
 * (3) recebido agora = 0, conflito de versão, pedido inexistente e falta de
 *     acesso ao Financeiro não criam lançamento nenhum.
 */
const TX = { tx: true };
const aplicarAdiantamento = vi.fn();
const getPedidoById = vi.fn();
const inserirLancamento = vi.fn();
const requireModule = vi.fn();

class ModuleAccessDeniedError extends Error {}

vi.mock("@/core/auth", () => ({
  ModuleAccessDeniedError,
  requireModule: (...args: unknown[]) => requireModule(...args),
}));

vi.mock("@/modules/pedidos", () => ({
  getPedidoById: (...args: unknown[]) => getPedidoById(...args),
  aplicarAdiantamento: (...args: unknown[]) => aplicarAdiantamento(...args),
  parseAdiantamentoFormData: () => ({
    success: true,
    data: { adiantamentoCents: 4000, paymentDueDate: undefined },
  }),
}));

vi.mock("@/modules/financeiro", () => ({
  inserirLancamento: (...args: unknown[]) => inserirLancamento(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { registrarRecebimentoPedido } = await import("../financeiro-actions");

function formWithVersion(version = "3") {
  const fd = new FormData();
  fd.set("headerVersion", version);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireModule.mockImplementation(async () => ({
    organizationId: "org1",
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    withDb: (fn: (tx: unknown) => unknown) => fn(TX),
  }));
  getPedidoById.mockResolvedValue({ id: "p1", number: 10, customerName: "Maria" });
});

function aplicado(beforeCents: number, afterCents: number, saldoCents: number) {
  return { kind: "ok", beforeCents, afterCents, totalCents: 10000, saldoCents, number: 10 };
}

describe("registrarRecebimentoPedido", () => {
  it("cria um lançamento 'adiantamento' pela diferença, na mesma transação", async () => {
    aplicarAdiantamento.mockResolvedValue(aplicado(1000, 4000, 6000));

    const result = await registrarRecebimentoPedido("p1", { ok: false }, formWithVersion());

    expect(result).toEqual({ ok: true });
    expect(aplicarAdiantamento).toHaveBeenCalledWith(
      TX,
      expect.objectContaining({ pedidoId: "p1", adiantamentoCents: 4000, expectedVersion: 3 }),
    );
    expect(inserirLancamento).toHaveBeenCalledTimes(1);
    expect(inserirLancamento).toHaveBeenCalledWith(
      TX,
      "org1",
      expect.objectContaining({
        type: "entrada",
        categoria: "adiantamento",
        amountCents: 3000,
        referenceType: "pedido",
        referenceId: "p1",
      }),
    );
  });

  it("usa 'saldo_recebido' quando o recebimento zera o saldo", async () => {
    aplicarAdiantamento.mockResolvedValue(aplicado(5000, 10000, 0));

    await registrarRecebimentoPedido("p1", { ok: false }, formWithVersion());

    expect(inserirLancamento).toHaveBeenCalledWith(
      TX,
      "org1",
      expect.objectContaining({ categoria: "saldo_recebido", amountCents: 5000 }),
    );
  });

  it("não cria lançamento quando nada novo foi recebido", async () => {
    aplicarAdiantamento.mockResolvedValue(aplicado(4000, 4000, 6000));

    const result = await registrarRecebimentoPedido("p1", { ok: false }, formWithVersion());

    expect(result.ok).toBe(true);
    expect(inserirLancamento).not.toHaveBeenCalled();
  });

  it("recusa com aviso quando outra pessoa alterou o pedido (conflito de versão)", async () => {
    aplicarAdiantamento.mockResolvedValue({ kind: "conflict" });

    const result = await registrarRecebimentoPedido("p1", { ok: false }, formWithVersion());

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/outra pessoa/);
    expect(inserirLancamento).not.toHaveBeenCalled();
  });

  it("não cria lançamento quando o pedido não existe", async () => {
    getPedidoById.mockResolvedValue(null);

    const result = await registrarRecebimentoPedido("x", { ok: false }, formWithVersion());

    expect(result).toEqual({ ok: false, message: "Pedido não encontrado." });
    expect(aplicarAdiantamento).not.toHaveBeenCalled();
    expect(inserirLancamento).not.toHaveBeenCalled();
  });

  it("pede para atualizar a página quando o formulário não traz a versão", async () => {
    const result = await registrarRecebimentoPedido("p1", { ok: false }, new FormData());

    expect(result.ok).toBe(false);
    expect(aplicarAdiantamento).not.toHaveBeenCalled();
  });

  it("sem acesso ao Financeiro: mensagem clara e nada gravado", async () => {
    requireModule.mockImplementation(async (slug: string) => {
      if (slug === "financeiro") throw new ModuleAccessDeniedError();
      return {
        organizationId: "org1",
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        withDb: (fn: (tx: unknown) => unknown) => fn(TX),
      };
    });

    const result = await registrarRecebimentoPedido("p1", { ok: false }, formWithVersion());

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Financeiro/);
    expect(aplicarAdiantamento).not.toHaveBeenCalled();
    expect(inserirLancamento).not.toHaveBeenCalled();
  });
});
