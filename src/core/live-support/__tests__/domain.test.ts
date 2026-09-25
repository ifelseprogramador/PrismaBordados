import { describe, expect, it } from "vitest";
import { isPendingSessionExpired, PENDING_SESSION_TTL_MINUTES } from "../domain";

describe("isPendingSessionExpired", () => {
  const now = new Date("2026-09-25T12:00:00Z");

  it("não expirado logo depois de criado", () => {
    expect(isPendingSessionExpired(new Date("2026-09-25T11:59:00Z"), now)).toBe(false);
  });

  it("não expirado exatamente no limite do TTL", () => {
    const createdAt = new Date(now.getTime() - PENDING_SESSION_TTL_MINUTES * 60_000);
    expect(isPendingSessionExpired(createdAt, now)).toBe(false);
  });

  it("expirado passado o TTL", () => {
    const createdAt = new Date(now.getTime() - (PENDING_SESSION_TTL_MINUTES * 60_000 + 1));
    expect(isPendingSessionExpired(createdAt, now)).toBe(true);
  });

  it("expirado com pedido bem antigo (esquecido há horas)", () => {
    expect(isPendingSessionExpired(new Date("2026-09-25T08:00:00Z"), now)).toBe(true);
  });
});
