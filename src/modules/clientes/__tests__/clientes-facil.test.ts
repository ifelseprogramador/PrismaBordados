import { describe, expect, it, vi } from "vitest";

// O arquivo importa componentes de servidor e a query do módulo; aqui só
// interessa a conta pura de "novos nos últimos 30 dias".
vi.mock("../queries", () => ({ listClientes: vi.fn() }));
vi.mock("@/components/search-box", () => ({ SearchBox: () => null }));
vi.mock("@/components/facil/facil-filters", () => ({ FacilFilters: () => null }));
vi.mock("../list-config", () => ({
  CLIENTE_FILTERS: [],
  CLIENTE_SORT_CHOICES: [],
  CLIENTE_DEFAULT_SORT: "name_asc",
}));

import { countNewLast30Days } from "../components/clientes-facil";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 9);

describe("countNewLast30Days", () => {
  it("conta só os cadastros dos últimos 30 dias", () => {
    const clientes = [
      { createdAt: new Date(NOW - 1 * DAY) },
      { createdAt: new Date(NOW - 30 * DAY) },
      { createdAt: new Date(NOW - 31 * DAY) },
    ];
    expect(countNewLast30Days(clientes, NOW)).toBe(2);
  });

  it("lista vazia dá zero", () => {
    expect(countNewLast30Days([], NOW)).toBe(0);
  });
});
