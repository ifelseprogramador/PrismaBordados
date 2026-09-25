import { describe, expect, it } from "vitest";
import { calculateLucro, calculatePeriodSummary, sumByType } from "../domain";

describe("sumByType", () => {
  it("soma só os lançamentos de entrada", () => {
    const total = sumByType(
      [
        { type: "entrada", amountCents: 1000 },
        { type: "saida", amountCents: 500 },
        { type: "entrada", amountCents: 2000 },
      ],
      "entrada",
    );
    expect(total).toBe(3000);
  });

  it("soma só os lançamentos de saída", () => {
    const total = sumByType(
      [
        { type: "entrada", amountCents: 1000 },
        { type: "saida", amountCents: 500 },
        { type: "saida", amountCents: 300 },
      ],
      "saida",
    );
    expect(total).toBe(800);
  });

  it("retorna 0 para uma lista sem lançamentos do tipo", () => {
    expect(sumByType([], "entrada")).toBe(0);
  });
});

describe("calculateLucro", () => {
  it("é entradas menos saídas", () => {
    expect(calculateLucro(10000, 4000)).toBe(6000);
  });

  it("pode ser negativo (prejuízo do período) — nunca clampado em zero", () => {
    expect(calculateLucro(1000, 5000)).toBe(-4000);
  });
});

describe("calculatePeriodSummary", () => {
  it("agrega entradas, saídas e lucro de um período", () => {
    const summary = calculatePeriodSummary([
      { type: "entrada", amountCents: 50000 },
      { type: "entrada", amountCents: 20000 },
      { type: "saida", amountCents: 30000 },
    ]);
    expect(summary).toEqual({ entradasCents: 70000, saidasCents: 30000, lucroCents: 40000 });
  });

  it("período sem lançamento nenhum tem tudo zerado", () => {
    expect(calculatePeriodSummary([])).toEqual({
      entradasCents: 0,
      saidasCents: 0,
      lucroCents: 0,
    });
  });
});
