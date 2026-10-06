import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * `registrarPagamentoCliente` soma ao adiantamento e cria o lançamento na
 * MESMA transação, com chave de idempotência. Sem banco (mocks): provamos o
 * contrato — chave repetida desfaz a soma (lançando dentro da transação) e
 * responde "já registrado"; sem acesso ao Financeiro nada é gravado.
 */
const TX = { tx: true };
const somarAdiantamento = vi.fn();
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
  somarAdiantamento: (...args: unknown[]) => somarAdiantamento(...args),
}));
vi.mock("@/modules/financeiro", () => ({
  inserirLancamento: (...args: unknown[]) => inserirLancamento(...args),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { registrarPagamentoCliente } = await import("../pagamento-cliente-actions");

const PEDIDO_ID = "11111111-1111-4111-8111-111111111111";

function form(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("pedidoId", PEDIDO_ID);
  fd.set("valor", "30,00");
  fd.set("date", "2026-10-06");
  fd.set("idempotencyKey", "chave-de-teste-123");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireModule.mockImplementation(async () => ({
    organizationId: "org1",
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    withDb: (fn: (tx: unknown) => unknown) => fn(TX),
  }));
  getPedidoById.mockResolvedValue({ id: PEDIDO_ID, number: 7, customerName: "Maria" });
  somarAdiantamento.mockResolvedValue({ id: PEDIDO_ID, adiantamentoCents: 3000, saldoCents: 7000 });
  inserirLancamento.mockResolvedValue({ id: "l1" });
});

describe("registrarPagamentoCliente", () => {
  it("soma o adiantamento e cria o lançamento com a chave, na mesma transação", async () => {
    const result = await registrarPagamentoCliente({ ok: false }, form());

    expect(result).toEqual({ ok: true });
    expect(somarAdiantamento).toHaveBeenCalledWith(
      TX,
      expect.objectContaining({ pedidoId: PEDIDO_ID, valorCents: 3000 }),
    );
    expect(inserirLancamento).toHaveBeenCalledWith(
      TX,
      "org1",
      expect.objectContaining({
        type: "entrada",
        categoria: "adiantamento",
        amountCents: 3000,
        idempotencyKey: "chave-de-teste-123",
      }),
    );
  });

  it("usa 'saldo_recebido' quando o pagamento zera o saldo", async () => {
    somarAdiantamento.mockResolvedValue({ id: PEDIDO_ID, adiantamentoCents: 10000, saldoCents: 0 });

    await registrarPagamentoCliente({ ok: false }, form());

    expect(inserirLancamento).toHaveBeenCalledWith(
      TX,
      "org1",
      expect.objectContaining({ categoria: "saldo_recebido" }),
    );
  });

  it("chave repetida: responde 'já registrado' (a transação é desfeita ao lançar)", async () => {
    inserirLancamento.mockResolvedValue(null);

    const result = await registrarPagamentoCliente({ ok: false }, form());

    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/já tinha sido registrado/);
  });

  it("recusa envio sem chave de idempotência", async () => {
    const result = await registrarPagamentoCliente({ ok: false }, form({ idempotencyKey: "" }));

    expect(result.ok).toBe(false);
    expect(somarAdiantamento).not.toHaveBeenCalled();
  });

  it("pedido inexistente: nada é lançado", async () => {
    somarAdiantamento.mockResolvedValue(null);

    const result = await registrarPagamentoCliente({ ok: false }, form());

    expect(result).toEqual({ ok: false, message: "Pedido não encontrado." });
    expect(inserirLancamento).not.toHaveBeenCalled();
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

    const result = await registrarPagamentoCliente({ ok: false }, form());

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Financeiro/);
    expect(somarAdiantamento).not.toHaveBeenCalled();
  });
});
