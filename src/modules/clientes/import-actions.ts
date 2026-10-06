"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { requireModule } from "@/core/auth";
import { SpreadsheetError } from "@/core/spreadsheet/columns";
import { readSheet } from "@/core/spreadsheet/xlsx";
import type {
  DuplicateMode,
  ImportDone,
  ImportIssue,
  ImportPreview,
} from "@/core/spreadsheet/types";
import { clienteEnderecos, clientes } from "./schema";
import { clienteSchema, splitClienteInput, type ClienteInput } from "./validation";
import { SHEET_NAME, clienteColumns, documentKey, rowToInput } from "./spreadsheet";

interface Entry {
  row: number;
  label: string;
  status: "ready" | "duplicate" | "error";
  message?: string;
  input?: ClienteInput;
  raw: Record<string, string>;
  existingId?: string;
}

const HEADER_BY_KEY = Object.fromEntries(clienteColumns.map((c) => [c.key, c.header]));
const MAX_ISSUES = 200;

/** Lê e valida a planilha inteira SEM gravar nada (usado pela prévia e, de novo, pela confirmação). */
async function analyze(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    throw new SpreadsheetError("Selecione um arquivo.");

  const sheet = await readSheet(
    { name: file.name, buffer: Buffer.from(await file.arrayBuffer()) },
    clienteColumns,
    SHEET_NAME,
  );
  if (sheet.missingRequired.length > 0) {
    throw new SpreadsheetError(
      `Não encontrei a coluna ${sheet.missingRequired.map((c) => `"${c}"`).join(", ")}. Use o modelo para manter os nomes das colunas.`,
    );
  }
  if (sheet.rows.length === 0)
    throw new SpreadsheetError("A planilha não tem nenhuma linha preenchida.");

  const { organizationId, withDb } = await requireModule("clientes");
  const existing = await withDb((tx) =>
    tx
      .select({ id: clientes.id, document: clientes.document })
      .from(clientes)
      .where(and(eq(clientes.organizationId, organizationId), isNull(clientes.anonymizedAt))),
  );
  const existingByDoc = new Map(
    existing.filter((c) => c.document).map((c) => [documentKey(c.document), c.id]),
  );

  const seen = new Map<string, number>();
  const entries: Entry[] = sheet.rows.map(({ row, values }) => {
    const label = values.name || values.document || `linha ${row}`;
    const mapped = rowToInput(values);
    if ("error" in mapped)
      return { row, label, status: "error", message: mapped.error, raw: values };

    const parsed = clienteSchema.safeParse(mapped.input);
    if (!parsed.success) {
      const message = Object.entries(parsed.error.flatten().fieldErrors)
        .map(([k, msgs]) => `${HEADER_BY_KEY[k] ?? k}: ${msgs?.[0]}`)
        .join(" · ");
      return { row, label, status: "error", message, raw: values };
    }

    const key = documentKey(parsed.data.document);
    if (key) {
      const firstRow = seen.get(key);
      if (firstRow) {
        return {
          row,
          label,
          status: "error",
          message: `CPF/CNPJ repetido: já aparece na linha ${firstRow} desta planilha.`,
          raw: values,
        };
      }
      seen.set(key, row);
      const existingId = existingByDoc.get(key);
      if (existingId)
        return { row, label, status: "duplicate", input: parsed.data, existingId, raw: values };
    }
    return { row, label, status: "ready", input: parsed.data, raw: values };
  });

  return { entries, unknownHeaders: sheet.unknownHeaders };
}

function failure(e: unknown): { ok: false; message: string } {
  return {
    ok: false,
    message:
      e instanceof SpreadsheetError ? e.message : "Não foi possível ler a planilha. Tente de novo.",
  };
}

const emptyPreview = {
  total: 0,
  ready: 0,
  duplicates: 0,
  errors: 0,
  issues: [],
  warnings: [],
  sample: [],
};

/** Passo 1: lê o arquivo e mostra o que VAI acontecer. Não grava nada. */
export async function previewClientesImport(formData: FormData): Promise<ImportPreview> {
  try {
    const { entries, unknownHeaders } = await analyze(formData);
    const issues: ImportIssue[] = entries
      .filter((e) => e.status === "error")
      .map((e) => ({ row: e.row, label: e.label, message: e.message! }));
    const ready = entries.filter((e) => e.status === "ready");
    return {
      ok: true,
      total: entries.length,
      ready: ready.length,
      duplicates: entries.filter((e) => e.status === "duplicate").length,
      errors: issues.length,
      issues: issues.slice(0, MAX_ISSUES),
      warnings: [
        ...(unknownHeaders.length
          ? [`Colunas não reconhecidas (ignoradas): ${unknownHeaders.join(", ")}.`]
          : []),
        ...(issues.length > MAX_ISSUES
          ? [`Mostrando só os primeiros ${MAX_ISSUES} problemas.`]
          : []),
      ],
      sample: ready.slice(0, 5).map((e) => ({ row: e.row, label: e.label })),
    };
  } catch (e) {
    return { ...emptyPreview, ...failure(e) };
  }
}

const CHUNK = 100;

/** Passo 2: grava. Revalida tudo no servidor (não confia na prévia). Linhas com erro nunca entram. */
export async function confirmClientesImport(formData: FormData): Promise<ImportDone> {
  const mode: DuplicateMode = formData.get("mode") === "update" ? "update" : "skip";
  const base: ImportDone = { ok: true, created: 0, updated: 0, skipped: 0, failed: 0, issues: [] };

  let entries: Entry[];
  try {
    entries = (await analyze(formData)).entries;
  } catch (e) {
    return { ...base, ...failure(e) };
  }

  const { organizationId, log, withDb } = await requireModule("clientes");
  const result = { ...base };

  // --- novos: em lotes; se um lote falhar, tenta linha a linha para isolar o problema ---
  const ready = entries.filter((e) => e.status === "ready");
  const insertBatch = (batch: Entry[]) =>
    withDb(async (tx) => {
      const split = batch.map((e) => ({ id: randomUUID(), ...splitClienteInput(e.input!) }));
      await tx
        .insert(clientes)
        .values(split.map((s) => ({ ...s.cliente, id: s.id, organizationId })));
      const enderecos = split.flatMap((s) =>
        s.endereco
          ? [{ ...s.endereco, organizationId, clienteId: s.id, kind: "principal" as const }]
          : [],
      );
      if (enderecos.length) await tx.insert(clienteEnderecos).values(enderecos);
    });

  for (let i = 0; i < ready.length; i += CHUNK) {
    const batch = ready.slice(i, i + CHUNK);
    try {
      await insertBatch(batch);
      result.created += batch.length;
    } catch {
      for (const e of batch) {
        try {
          await insertBatch([e]);
          result.created++;
        } catch {
          result.failed++;
          result.issues.push({
            row: e.row,
            label: e.label,
            message: "Não foi possível gravar este cliente.",
          });
        }
      }
    }
  }

  // --- já existentes ---
  const duplicates = entries.filter((e) => e.status === "duplicate");
  if (mode === "skip") {
    result.skipped = duplicates.length;
  } else {
    for (const e of duplicates) {
      try {
        await withDb(async (tx) => {
          const { cliente, endereco } = splitClienteInput(e.input!);
          // Célula em branco NÃO apaga o que já existe no sistema.
          const set: Record<string, unknown> = Object.fromEntries(
            Object.entries(cliente).filter(([, v]) => v !== null && v !== undefined),
          );
          if (!e.raw.type) delete set.type;
          if (!e.raw.ieIndicator) delete set.ieIndicator;
          const rows = await tx
            .update(clientes)
            .set({ ...set, updatedAt: new Date() })
            .where(
              and(
                eq(clientes.id, e.existingId!),
                eq(clientes.organizationId, organizationId),
                isNull(clientes.anonymizedAt),
              ),
            )
            .returning({ id: clientes.id });
          if (rows.length === 0) throw new Error("sumiu");
          if (endereco) {
            const filled = Object.fromEntries(
              Object.entries(endereco).filter(([, v]) => v !== null),
            );
            await tx
              .insert(clienteEnderecos)
              .values({ ...endereco, organizationId, clienteId: e.existingId!, kind: "principal" })
              .onConflictDoUpdate({
                target: clienteEnderecos.clienteId,
                targetWhere: eq(clienteEnderecos.kind, "principal"),
                set: { ...filled, updatedAt: new Date() },
              });
          }
        });
        result.updated++;
      } catch {
        result.failed++;
        result.issues.push({
          row: e.row,
          label: e.label,
          message: "Não foi possível atualizar este cliente.",
        });
      }
    }
  }

  log.info("clientes.importar_planilha", {
    mode,
    created: result.created,
    updated: result.updated,
    skipped: result.skipped,
    failed: result.failed,
    errors: entries.filter((e) => e.status === "error").length,
  });
  revalidatePath("/clientes");
  return result;
}
