import { z } from "zod";
import { isValidDocument } from "@/core/document";

/**
 * Contrato de entrada único para o form (react-hook-form) e a Server
 * Action — nunca confie só na validação do cliente.
 */
export const clienteSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome completo."),
  document: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => !v || isValidDocument(v), "CPF/CNPJ inválido."),
  phone: z.string().trim().min(8, "Informe um telefone válido."),
  address: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => !v || z.email().safeParse(v).success, "E-mail inválido."),
});

export type ClienteInput = z.infer<typeof clienteSchema>;

export function parseClienteFormData(formData: FormData) {
  return clienteSchema.safeParse({
    name: formData.get("name"),
    document: formData.get("document"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    email: formData.get("email"),
  });
}
