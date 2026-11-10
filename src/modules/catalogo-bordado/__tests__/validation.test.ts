import { describe, expect, it } from "vitest";
import { catalogoBordadoItemSchema, parseCatalogoBordadoItemFormData } from "../validation";

describe("catalogoBordadoItemSchema", () => {
  it("aceita um item mínimo válido", () => {
    const result = catalogoBordadoItemSchema.safeParse({ tipoProduto: "toalha" });
    expect(result.success).toBe(true);
  });

  it("rejeita tipoProduto vazio", () => {
    const result = catalogoBordadoItemSchema.safeParse({ tipoProduto: "" });
    expect(result.success).toBe(false);
  });

  it("preenche defaultPriceCents com 0 quando omitido", () => {
    const result = catalogoBordadoItemSchema.parse({ tipoProduto: "toalha" });
    expect(result.defaultPriceCents).toBe(0);
  });
});

describe("parseCatalogoBordadoItemFormData", () => {
  it("separa listas de tamanhos e cores por vírgula", () => {
    const formData = new FormData();
    formData.set("tipoProduto", "camiseta");
    formData.set("tamanhosAceitos", "P, M, G");
    formData.set("coresAceitas", "branco, preto");
    formData.set("defaultPrice", "25,90");

    const result = parseCatalogoBordadoItemFormData(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tamanhosAceitos).toEqual(["P", "M", "G"]);
      expect(result.data.coresAceitas).toEqual(["branco", "preto"]);
      expect(result.data.defaultPriceCents).toBe(2590);
    }
  });
});

describe("cadastro rápido do modo Fácil: payload mínimo passa na validação", () => {
  it("produto só com nome e preço (unidade e origem assumem o padrão)", async () => {
    const { parseCatalogoBordadoItemFormData } = await import("../validation");
    const formData = new FormData();
    formData.set("tipoProduto", "Camiseta");
    formData.set("defaultPrice", "45,00");
    const result = parseCatalogoBordadoItemFormData(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unidade).toBe("UN");
      expect(result.data.defaultPriceCents).toBe(4500);
    }
  });
});

describe("cadastro rápido com os opcionais (Mais dados)", () => {
  async function quick(extra: Record<string, string>) {
    const { parseCatalogoBordadoItemFormData } = await import("../validation");
    const formData = new FormData();
    formData.set("tipoProduto", "Camiseta");
    formData.set("defaultPrice", "45,00");
    formData.set("modeloPadrao", "");
    formData.set("tamanhosAceitos", "");
    formData.set("coresAceitas", "");
    for (const [key, value] of Object.entries(extra)) formData.set(key, value);
    return parseCatalogoBordadoItemFormData(formData);
  }

  it("transforma tamanhos e cores separados por vírgula em listas", async () => {
    const result = await quick({
      modeloPadrao: "Gola V",
      tamanhosAceitos: "P, M ,G",
      coresAceitas: "branco, preto",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modeloPadrao).toBe("Gola V");
      expect(result.data.tamanhosAceitos).toEqual(["P", "M", "G"]);
      expect(result.data.coresAceitas).toEqual(["branco", "preto"]);
    }
  });

  it("vazios continuam valendo: sem modelo e listas vazias", async () => {
    const result = await quick({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modeloPadrao).toBeUndefined();
      expect(result.data.tamanhosAceitos).toEqual([]);
    }
  });
});
