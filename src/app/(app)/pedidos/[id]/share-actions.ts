"use server";

/**
 * Orquestração pedidos/clientes/fiscal → documento compartilhável
 * (`core/share`). Monta o snapshot (orçamento/pedido/nota) a partir dos
 * barrels de cada módulo e devolve o link público para o
 * `ShareDocumentButton`. Vive em `app/` (não em um módulo) pelo mesmo motivo
 * de `fiscal-actions.ts`: cruza módulos.
 */
import { eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { formatCents } from "@/core/money";
import { formatDate } from "@/core/format";
import { formatAddressLine } from "@/core/fiscal-fields";
import { formatDocument } from "@/core/document";
import { organizations } from "@/db/schema";
import { createSharedDocument, type ShareLinkResult } from "@/core/share/create";
import type { ShareDocumentInput } from "@/core/share/document";
import { getPedidoById, listPedidoItens, PEDIDO_STATUS_LABELS } from "@/modules/pedidos";
import { getClienteById } from "@/modules/clientes";
import { listFiscalNotasByPedido } from "@/modules/fiscal";

async function loadBase(pedidoId: string) {
  const { organizationId, withDb } = await withOrg();
  const [pedido, itens, [org]] = await Promise.all([
    getPedidoById(pedidoId),
    listPedidoItens(pedidoId),
    withDb((db) =>
      db
        .select({
          name: organizations.name,
          displayName: organizations.displayName,
          document: organizations.document,
          phone: organizations.phone,
          address: organizations.address,
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1),
    ),
  ]);
  if (!pedido || !org) return null;
  const cliente = await getClienteById(pedido.customerId);
  if (!cliente) return null;

  const customerLines = [
    cliente.document ? formatDocument(cliente.document) : "",
    cliente.phone,
    formatAddressLine(cliente.endereco) || cliente.address || "",
  ].filter((l): l is string => Boolean(l));

  const issuer = {
    issuerName: org.displayName || org.name,
    issuerLines: [
      org.document ? formatDocument(org.document) : "",
      org.phone ?? "",
      org.address ?? "",
    ].filter(Boolean),
    customerName: cliente.name,
    customerLines,
  };
  return { pedido, itens, cliente, issuer };
}

export async function compartilharPedido(pedidoId: string): Promise<ShareLinkResult> {
  const base = await loadBase(pedidoId);
  if (!base) return { ok: false, message: "Pedido não encontrado." };
  const { pedido, itens, cliente, issuer } = base;

  const isOrcamento = pedido.status === "orcamento";
  const doc: ShareDocumentInput = {
    kind: isOrcamento ? "orcamento" : "pedido",
    title: isOrcamento ? "Orçamento" : `Pedido — ${PEDIDO_STATUS_LABELS[pedido.status]}`,
    number: String(pedido.number),
    ...issuer,
    sections: [
      {
        heading: "Datas",
        rows: [
          { label: "Data do pedido", value: formatDate(pedido.orderDate) },
          ...(pedido.deliveryDate
            ? [
                {
                  label: "Entrega",
                  value: `${formatDate(pedido.deliveryDate)}${pedido.deliveryTime ? ` às ${pedido.deliveryTime}` : ""}`,
                },
              ]
            : []),
          ...(pedido.paymentDueDate
            ? [{ label: "Vencimento", value: formatDate(pedido.paymentDueDate) }]
            : []),
        ],
      },
    ],
    table: {
      columns: [
        { label: "Item" },
        { label: "Qtd", align: "right" },
        { label: "Unitário", align: "right" },
        { label: "Total", align: "right" },
      ],
      rows: itens.map((i) => [
        i.produto,
        String(Number(i.quantity)),
        formatCents(i.unitPriceCents),
        formatCents(Math.round(i.unitPriceCents * Number(i.quantity))),
      ]),
    },
    totals: [
      ...(pedido.adiantamentoCents
        ? [{ label: "Adiantamento", value: formatCents(pedido.adiantamentoCents) }]
        : []),
      ...(pedido.adiantamentoCents
        ? [{ label: "Saldo a receber", value: formatCents(pedido.saldoCents ?? 0) }]
        : []),
      { label: "Total", value: formatCents(pedido.totalCents), strong: true },
    ],
  };

  return createSharedDocument(doc, {
    recipient: { name: cliente.name, phone: cliente.phone, email: cliente.email },
    source: { type: "pedido", id: pedido.id },
  });
}

export async function compartilharNota(pedidoId: string, notaId: string): Promise<ShareLinkResult> {
  const base = await loadBase(pedidoId);
  if (!base) return { ok: false, message: "Pedido não encontrado." };
  const nota = (await listFiscalNotasByPedido(pedidoId)).find((n) => n.id === notaId);
  if (!nota || nota.status !== "emitida") {
    return { ok: false, message: "Só notas emitidas podem ser enviadas." };
  }
  const { pedido, cliente, issuer } = base;

  const links = [
    ...(nota.pdfUrl ? [{ label: "Baixar DANFE/PDF da nota", url: nota.pdfUrl }] : []),
    ...(nota.xmlUrl ? [{ label: "Baixar XML", url: nota.xmlUrl }] : []),
  ];
  const doc: ShareDocumentInput = {
    kind: "nota_fiscal",
    title: `${nota.tipo === "nfe" ? "NF-e" : "NFS-e"} do pedido #${pedido.number}`,
    number: nota.providerNotaId ?? undefined,
    ...issuer,
    sections: [
      {
        heading: "Nota fiscal",
        rows: [
          { label: "Tipo", value: nota.tipo === "nfe" ? "NF-e (produto)" : "NFS-e (serviço)" },
          { label: "Pedido", value: `#${pedido.number}` },
          { label: "Valor total", value: formatCents(pedido.totalCents) },
        ],
      },
    ],
    links,
  };

  return createSharedDocument(doc, {
    recipient: { name: cliente.name, phone: cliente.phone, email: cliente.email },
    source: { type: "fiscal_nota", id: nota.id },
  });
}
