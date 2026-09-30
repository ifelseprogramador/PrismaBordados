import { z } from "zod";
import { isValidDocument } from "@/core/document";
import { isValidCep, isValidIbge, isValidIe, isValidUf, onlyDigits } from "@/core/fiscal-fields";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined);

/**
 * Contrato de entrada único para o form e a Server Action — nunca confie só
 * na validação do cliente. Campos fiscais/endereço são opcionais no
 * cadastro; a exigência para emitir nota é checada em `modules/fiscal`.
 */
export const clienteSchema = z
  .object({
    type: z.enum(["pf", "pj"]).optional(),
    name: z.string().trim().min(2, "Informe o nome completo."),
    legalName: optionalText,
    tradeName: optionalText,
    document: optionalText.refine((v) => !v || isValidDocument(v), "CPF/CNPJ inválido."),
    ieIndicator: z.enum(["contribuinte", "isento", "nao_contribuinte"]).default("nao_contribuinte"),
    ie: optionalText,
    im: optionalText,
    phone: z.string().trim().min(8, "Informe um telefone válido."),
    email: optionalText.refine((v) => !v || z.email().safeParse(v).success, "E-mail inválido."),
    zip: optionalText.refine((v) => !v || isValidCep(v), "CEP deve ter 8 dígitos."),
    street: optionalText,
    number: optionalText,
    complement: optionalText,
    district: optionalText,
    city: optionalText,
    state: optionalText.refine((v) => !v || isValidUf(v), "UF inválida."),
    ibgeCode: optionalText.refine((v) => !v || isValidIbge(v), "Código IBGE deve ter 7 dígitos."),
  })
  .superRefine((v, ctx) => {
    if (v.ieIndicator === "contribuinte" && !v.ie) {
      ctx.addIssue({ code: "custom", path: ["ie"], message: "Informe a Inscrição Estadual." });
    }
    if (v.ie && v.ieIndicator === "contribuinte" && !isValidIe(v.ie)) {
      ctx.addIssue({ code: "custom", path: ["ie"], message: "Inscrição Estadual inválida." });
    }
  });

export type ClienteInput = z.infer<typeof clienteSchema>;

const FIELDS = [
  "type",
  "name",
  "legalName",
  "tradeName",
  "document",
  "ieIndicator",
  "ie",
  "im",
  "phone",
  "email",
  "zip",
  "street",
  "number",
  "complement",
  "district",
  "city",
  "state",
  "ibgeCode",
] as const;

/** Valores brutos enviados no form — devolvidos com o erro para o form
 * repopular os campos (um erro nunca apaga o que já estava certo). */
export function rawClienteValues(formData: FormData): Record<string, string> {
  return Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "")]));
}

export function parseClienteFormData(formData: FormData) {
  const raw = rawClienteValues(formData);
  return clienteSchema.safeParse(
    Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v === "" ? undefined : v])),
  );
}

/** Separa o input plano em colunas de `clientes` e do endereço principal. */
export function splitClienteInput(input: ClienteInput) {
  const { zip, street, number, complement, district, city, state, ibgeCode, ...rest } = input;
  const docDigits = input.document ? onlyDigits(input.document) : "";
  const cliente = {
    ...rest,
    type: input.type ?? (docDigits.length === 14 ? ("pj" as const) : ("pf" as const)),
    // IE só faz sentido para contribuinte.
    ie: input.ieIndicator === "contribuinte" ? (input.ie ?? null) : null,
    document: input.document ?? null,
    email: input.email ?? null,
    legalName: input.legalName ?? null,
    tradeName: input.tradeName ?? null,
    im: input.im ?? null,
  };
  const endereco = { zip, street, number, complement, district, city, state, ibgeCode };
  const hasEndereco = Object.values(endereco).some(Boolean);
  return {
    cliente,
    endereco: hasEndereco
      ? {
          zip: zip ? onlyDigits(zip) : null,
          street: street ?? null,
          number: number ?? null,
          complement: complement ?? null,
          district: district ?? null,
          city: city ?? null,
          state: state ? state.toUpperCase() : null,
          ibgeCode: ibgeCode ?? null,
        }
      : null,
  };
}
