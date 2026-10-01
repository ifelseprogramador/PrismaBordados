import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildExport, buildTemplate, readSheet } from "@/core/spreadsheet/xlsx";
import { clienteSchema, splitClienteInput } from "../validation";
import {
  SHEET_NAME,
  clienteColumns,
  clienteToRow,
  parseIeIndicator,
  parseType,
  rowToInput,
} from "../spreadsheet";

describe("rótulos amigáveis", () => {
  it("aceita rótulo da lista, sigla e variações; recusa o resto", () => {
    expect(parseType("Pessoa física")).toBe("pf");
    expect(parseType("PJ")).toBe("pj");
    expect(parseType("Empresa")).toBe("pj");
    expect(parseType("")).toBeUndefined();
    expect(parseType("alienígena")).toBe("invalid");
    expect(parseIeIndicator("Não contribuinte")).toBe("nao_contribuinte");
    expect(parseIeIndicator("Contribuinte")).toBe("contribuinte");
    expect(parseIeIndicator("ISENTO")).toBe("isento");
    expect(parseIeIndicator("talvez")).toBe("invalid");
  });

  it("rowToInput converte rótulos, põe UF em maiúsculas e devolve erro amigável", () => {
    const ok = rowToInput({
      name: "Ana",
      type: "Pessoa jurídica",
      state: "sp",
      ieIndicator: "Isento",
      email: "",
    });
    expect(ok).toEqual({
      input: { name: "Ana", type: "pj", state: "SP", ieIndicator: "isento", email: undefined },
    });
    expect(rowToInput({ name: "Ana", type: "xx" })).toEqual({
      error: 'Tipo deve ser "Pessoa física" ou "Pessoa jurídica".',
    });
  });
});

describe("modelo → planilha preenchida → cliente", () => {
  it("restaura zeros do CEP/IBGE/CPF que o Excel remove e valida pelo schema de cliente", async () => {
    const template = await buildTemplate({
      sheetName: SHEET_NAME,
      title: "Modelo",
      columns: clienteColumns,
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(template as unknown as ArrayBuffer);
    const sheet = wb.getWorksheet(SHEET_NAME)!;
    const header = clienteColumns.map((c) => c.key);
    const put = (row: number, data: Record<string, string | number>) =>
      header.forEach((k, i) => {
        if (k in data) sheet.getCell(row, i + 1).value = data[k];
      });
    // CEP e CPF digitados só com números viram número no Excel (perdem o zero).
    put(2, {
      name: "Maria",
      type: "Pessoa física",
      document: 1234567890 + 0,
      phone: "11999998888",
      zip: 1310100,
      ibgeCode: 3550308,
      state: "SP",
      ieIndicator: "Não contribuinte",
    });
    put(3, {
      name: "Empresa X",
      type: "Pessoa jurídica",
      document: "11.222.333/0001-81",
      phone: "1133334444",
      legalName: "Empresa X Ltda",
      ieIndicator: "Contribuinte",
      ie: "123456",
    });
    const file = Buffer.from(await wb.xlsx.writeBuffer());

    const read = await readSheet({ name: "c.xlsx", buffer: file }, clienteColumns, SHEET_NAME);
    expect(read.missingRequired).toEqual([]);
    expect(read.rows[0].values.zip).toBe("01310100");
    expect(read.rows[0].values.ibgeCode).toBe("3550308");
    expect(read.rows[0].values.document).toBe("01234567890");

    const empresa = rowToInput(read.rows[1].values);
    const parsed = clienteSchema.safeParse("input" in empresa ? empresa.input : {});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const { cliente } = splitClienteInput(parsed.data);
      expect(cliente).toMatchObject({ type: "pj", ieIndicator: "contribuinte", ie: "123456" });
    }
  });

  it("exportar → importar de volta mantém os dados (ida e volta)", async () => {
    const row = clienteToRow({
      type: "pj",
      name: "Empresa X",
      document: "11222333000181",
      phone: "1133334444",
      email: "a@x.com",
      legalName: "Empresa X Ltda",
      tradeName: null,
      ieIndicator: "contribuinte",
      ie: "123",
      im: null,
      endereco: {
        zip: "01310100",
        street: "Av. Paulista",
        number: "1000",
        complement: null,
        district: "Bela Vista",
        city: "São Paulo",
        state: "SP",
        ibgeCode: "3550308",
      },
    });
    const file = await buildExport({ sheetName: SHEET_NAME, columns: clienteColumns, rows: [row] });
    const read = await readSheet({ name: "e.xlsx", buffer: file }, clienteColumns, SHEET_NAME);
    const mapped = rowToInput(read.rows[0].values);
    const parsed = clienteSchema.safeParse("input" in mapped ? mapped.input : {});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toMatchObject({
        type: "pj",
        name: "Empresa X",
        ie: "123",
        city: "São Paulo",
        zip: "01310-100",
      });
    }
  });
});
