import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "@/core/format";

describe("formatDate", () => {
  it("formata data no padrão brasileiro", () => {
    expect(formatDate(new Date("2026-01-05T12:00:00Z"))).toBe("05/01/2026");
  });

  it("aceita string ISO", () => {
    expect(formatDate("2026-12-25T12:00:00Z")).toBe("25/12/2026");
  });

  it("data pura (coluna `date` do Postgres, sem hora) não perde um dia em fuso atrás de UTC", () => {
    // Bug real: "2026-09-26" interpretado como meia-noite UTC virava
    // 25/09 em qualquer fuso do Brasil (UTC-3) ao formatar no horário
    // local — precisa ser tratado como horário local, não UTC.
    expect(formatDate("2026-09-26")).toBe("26/09/2026");
  });
});

describe("formatDateTime", () => {
  it("inclui hora e minuto", () => {
    expect(formatDateTime(new Date("2026-01-05T12:30:00Z"))).toMatch(/05\/01\/2026 \d{2}:\d{2}/);
  });
});
