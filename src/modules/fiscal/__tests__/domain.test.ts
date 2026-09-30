import { describe, expect, it } from "vitest";
import {
  buildEmitentePayload,
  validarClienteParaNota,
  validarEmitente,
  validarItensParaNota,
  buildFiscalItemPayload,
  decideOperacaoTipo,
  splitItensPorOperacao,
} from "../domain";

describe("decideOperacaoTipo", () => {
  it("item vinculado a um item de catálogo é venda (NF-e)", () => {
    expect(decideOperacaoTipo({ catalogoItemId: "cat-1" })).toBe("venda");
  });

  it("item sem vínculo de catálogo (peça trazida pelo cliente) é serviço (NFS-e)", () => {
    expect(decideOperacaoTipo({ catalogoItemId: null })).toBe("servico");
    expect(decideOperacaoTipo({ catalogoItemId: undefined })).toBe("servico");
  });
});

describe("buildFiscalItemPayload", () => {
  it("monta o payload do item com o tipo de operação decidido", () => {
    const payload = buildFiscalItemPayload(
      { catalogoItemId: "cat-1", produto: "Toalha bordada", quantity: "2", unitPriceCents: 5000 },
      buildEmitentePayload(undefined),
    );
    expect(payload).toEqual({
      descricao: "Toalha bordada",
      quantidade: 2,
      valorUnitarioCents: 5000,
      tipoOperacao: "venda",
      fiscal: { ncm: undefined, cfop: undefined, unidade: "UN", origem: "0", cst: undefined },
    });
  });
});

describe("splitItensPorOperacao", () => {
  it("separa itens de venda e de serviço", () => {
    const itens = [
      { catalogoItemId: "cat-1", produto: "Toalha", quantity: 1, unitPriceCents: 2000 },
      {
        catalogoItemId: null,
        produto: "Camiseta trazida pelo cliente",
        quantity: 1,
        unitPriceCents: 1500,
      },
    ];
    const { venda, servico } = splitItensPorOperacao(itens);
    expect(venda).toHaveLength(1);
    expect(servico).toHaveLength(1);
    expect(venda[0].produto).toBe("Toalha");
    expect(servico[0].produto).toBe("Camiseta trazida pelo cliente");
  });

  it("pedido só com peça própria do cliente gera só grupo de serviço", () => {
    const itens = [
      { catalogoItemId: null, produto: "Boné do cliente", quantity: 1, unitPriceCents: 1000 },
    ];
    const { venda, servico } = splitItensPorOperacao(itens);
    expect(venda).toHaveLength(0);
    expect(servico).toHaveLength(1);
  });
});

describe("validarClienteParaNota", () => {
  const endereco = {
    cep: "01310100",
    logradouro: "Av. Paulista",
    numero: "1000",
    bairro: "Bela Vista",
    municipio: "São Paulo",
    uf: "SP",
    codigoIbge: "3550308",
  };

  it("NF-e sem endereço e documento lista as pendências", () => {
    const r = validarClienteParaNota({ nome: "Maria" }, [{ catalogoItemId: "x" }]);
    expect(r).toContain("CPF/CNPJ (NF-e)");
    expect(r).toContain("código IBGE (NF-e)");
  });

  it("NF-e completa não tem pendências", () => {
    expect(
      validarClienteParaNota(
        { nome: "Maria", documento: "52998224725", enderecoEstruturado: endereco },
        [{ catalogoItemId: "x" }],
      ),
    ).toEqual([]);
  });

  it("PJ contribuinte exige razão social e IE", () => {
    const r = validarClienteParaNota(
      {
        nome: "X",
        documento: "11222333000181",
        tipo: "pj",
        indicadorIe: "contribuinte",
        enderecoEstruturado: endereco,
      },
      [{ catalogoItemId: "x" }],
    );
    expect(r).toEqual(["razão social (NF-e)", "Inscrição Estadual"]);
  });

  it("NFS-e só exige município do tomador", () => {
    expect(
      validarClienteParaNota({ nome: "Maria", enderecoEstruturado: endereco }, [
        { catalogoItemId: null },
      ]),
    ).toEqual([]);
    expect(validarClienteParaNota({ nome: "Maria" }, [{ catalogoItemId: null }])).toHaveLength(3);
  });
});

describe("emitente e itens", () => {
  const row = {
    cnpj: "11.222.333/0001-81",
    razaoSocial: "Bordados Ltda",
    nomeFantasia: null,
    ie: "123456",
    im: "9876",
    regimeTributario: "simples_nacional",
    serieNota: "1",
    zip: "01310100",
    street: "Av. Paulista",
    number: "1000",
    complement: null,
    district: "Bela Vista",
    city: "São Paulo",
    state: "SP",
    ibgeCode: "3550308",
    defaultNcm: "62179000",
    defaultCfop: "5102",
    codigoServico: "14.01",
    cnae: null,
    issRateBps: 250,
  };

  it("emitente completo não tem pendências; vazio lista as da NF-e", () => {
    const itens = [{ catalogoItemId: "x" }];
    expect(validarEmitente(buildEmitentePayload(row), itens)).toEqual([]);
    const vazio = validarEmitente(buildEmitentePayload(undefined), itens);
    expect(vazio).toContain("Inscrição Estadual da empresa");
    expect(vazio).toContain("código IBGE da empresa");
  });

  it("NFS-e exige IM e IBGE, não IE", () => {
    const r = validarEmitente(buildEmitentePayload({ ...row, im: null, ie: null }), [
      { catalogoItemId: null },
    ]);
    expect(r).toEqual(["Inscrição Municipal da empresa"]);
  });

  it("item herda NCM/CFOP do emitente e exige CST", () => {
    const em = buildEmitentePayload(row);
    const item = { catalogoItemId: "x", produto: "Toalha", quantity: 1, unitPriceCents: 100 };
    const semCst = validarItensParaNota([buildFiscalItemPayload(item, em)]);
    expect(semCst).toEqual(["CST/CSOSN (Toalha)"]);
    const ok = validarItensParaNota([
      buildFiscalItemPayload({ ...item, fiscal: { cst: "102" } }, em),
    ]);
    expect(ok).toEqual([]);
  });

  it("serviço usa LC 116 e ISS do emitente", () => {
    const em = buildEmitentePayload(row);
    const p = buildFiscalItemPayload(
      { catalogoItemId: null, produto: "Bordado", quantity: 1, unitPriceCents: 100 },
      em,
    );
    expect(p.fiscal).toMatchObject({ codigoServico: "14.01", aliquotaIssBps: 250 });
    expect(validarItensParaNota([p])).toEqual([]);
    expect(
      validarItensParaNota([
        buildFiscalItemPayload(
          { catalogoItemId: null, produto: "Bordado", quantity: 1, unitPriceCents: 100 },
          buildEmitentePayload(undefined),
        ),
      ]),
    ).toHaveLength(2);
  });
});
