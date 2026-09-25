import { describe, expect, it } from "vitest";
import {
  calculateItemTotal,
  calculateOrderTotal,
  calculateSaldo,
  isAdiantamentoAboveTotal,
  isDebtStatus,
  isOverdue,
  isReceivableStatus,
  isTerminalStatus,
  isValidTransition,
  type PedidoStatus,
} from "../domain";

describe("isValidTransition", () => {
  it("permite o fluxo feliz completo", () => {
    expect(isValidTransition("orcamento", "aprovado")).toBe(true);
    expect(isValidTransition("aprovado", "em_producao")).toBe(true);
    expect(isValidTransition("em_producao", "pronto")).toBe(true);
    expect(isValidTransition("pronto", "entregue")).toBe(true);
  });

  it("permite cancelar a partir de qualquer estado não-terminal", () => {
    const naoTerminais: PedidoStatus[] = ["orcamento", "aprovado", "em_producao", "pronto"];
    for (const status of naoTerminais) {
      expect(isValidTransition(status, "cancelado")).toBe(true);
    }
  });

  it("rejeita pular etapas", () => {
    expect(isValidTransition("orcamento", "em_producao")).toBe(false);
    expect(isValidTransition("orcamento", "pronto")).toBe(false);
    expect(isValidTransition("orcamento", "entregue")).toBe(false);
    expect(isValidTransition("aprovado", "pronto")).toBe(false);
    expect(isValidTransition("aprovado", "entregue")).toBe(false);
  });

  it("rejeita transição a partir de um estado terminal", () => {
    expect(isValidTransition("entregue", "aprovado")).toBe(false);
    expect(isValidTransition("entregue", "cancelado")).toBe(false);
    expect(isValidTransition("cancelado", "aprovado")).toBe(false);
    expect(isValidTransition("cancelado", "orcamento")).toBe(false);
  });

  it("rejeita retroceder de estado", () => {
    expect(isValidTransition("em_producao", "aprovado")).toBe(false);
    expect(isValidTransition("pronto", "em_producao")).toBe(false);
  });
});

describe("isTerminalStatus", () => {
  it("entregue e cancelado são terminais", () => {
    expect(isTerminalStatus("entregue")).toBe(true);
    expect(isTerminalStatus("cancelado")).toBe(true);
  });

  it("os demais não são terminais", () => {
    expect(isTerminalStatus("orcamento")).toBe(false);
    expect(isTerminalStatus("aprovado")).toBe(false);
    expect(isTerminalStatus("em_producao")).toBe(false);
    expect(isTerminalStatus("pronto")).toBe(false);
  });
});

describe("calculateItemTotal", () => {
  it("multiplica quantidade por preço unitário", () => {
    expect(calculateItemTotal({ quantity: 2, unitPriceCents: 1500 })).toBe(3000);
  });

  it("arredonda quantidades fracionárias", () => {
    expect(calculateItemTotal({ quantity: 1.5, unitPriceCents: 1000 })).toBe(1500);
  });
});

describe("calculateOrderTotal", () => {
  it("soma o total de todos os itens", () => {
    const total = calculateOrderTotal([
      { quantity: 2, unitPriceCents: 1000 },
      { quantity: 1, unitPriceCents: 500 },
    ]);
    expect(total).toBe(2500);
  });

  it("retorna 0 para pedido sem itens", () => {
    expect(calculateOrderTotal([])).toBe(0);
  });
});

describe("calculateSaldo", () => {
  it("subtrai adiantamento do total", () => {
    expect(calculateSaldo(10000, 4000)).toBe(6000);
  });

  it("nunca fica negativo (adiantamento maior que o total)", () => {
    expect(calculateSaldo(10000, 15000)).toBe(0);
  });

  it("saldo cheio quando não há adiantamento", () => {
    expect(calculateSaldo(10000, 0)).toBe(10000);
  });
});

describe("isAdiantamentoAboveTotal", () => {
  it("detecta adiantamento maior que o total", () => {
    expect(isAdiantamentoAboveTotal(10000, 15000)).toBe(true);
  });

  it("não acusa quando adiantamento é igual ou menor", () => {
    expect(isAdiantamentoAboveTotal(10000, 10000)).toBe(false);
    expect(isAdiantamentoAboveTotal(10000, 5000)).toBe(false);
  });
});

describe("isReceivableStatus", () => {
  it("pedido cancelado nunca conta como 'a receber'", () => {
    expect(isReceivableStatus("cancelado")).toBe(false);
  });

  it("pedido entregue também não conta (cobrança sai do pipeline)", () => {
    expect(isReceivableStatus("entregue")).toBe(false);
  });

  it("estados em andamento contam como 'a receber'", () => {
    const emAndamento: PedidoStatus[] = ["orcamento", "aprovado", "em_producao", "pronto"];
    for (const status of emAndamento) {
      expect(isReceivableStatus(status)).toBe(true);
    }
  });
});

describe("isDebtStatus", () => {
  it("pedido cancelado nunca conta como dívida", () => {
    expect(isDebtStatus("cancelado")).toBe(false);
  });

  it("pedido entregue CONTA como dívida (diferente de isReceivableStatus)", () => {
    expect(isDebtStatus("entregue")).toBe(true);
  });

  it("estados em andamento contam como dívida", () => {
    const emAndamento: PedidoStatus[] = ["orcamento", "aprovado", "em_producao", "pronto"];
    for (const status of emAndamento) {
      expect(isDebtStatus(status)).toBe(true);
    }
  });
});

describe("isOverdue", () => {
  const hoje = new Date("2026-09-25T12:00:00");

  it("atrasado quando o vencimento já passou e ainda há saldo", () => {
    expect(isOverdue("2026-09-20", 5000, hoje)).toBe(true);
  });

  it("não atrasado quando o vencimento ainda não chegou", () => {
    expect(isOverdue("2026-10-01", 5000, hoje)).toBe(false);
  });

  it("nunca atrasado se o saldo já foi quitado, mesmo com vencimento no passado", () => {
    expect(isOverdue("2026-09-20", 0, hoje)).toBe(false);
  });

  it("nunca atrasado sem vencimento definido", () => {
    expect(isOverdue(null, 5000, hoje)).toBe(false);
  });
});
