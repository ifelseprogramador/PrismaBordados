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
