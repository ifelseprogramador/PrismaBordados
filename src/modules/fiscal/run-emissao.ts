import type {
  FiscalCancelamentoResultado,
  FiscalClientePayload,
  FiscalEmissaoPayload,
  FiscalEmissaoResultado,
  FiscalProvider,
} from "./provider";
import { buildFiscalItemPayload, splitItensPorOperacao, type PedidoItemLike } from "./domain";

export interface RunEmissaoInput {
  organizationId: string;
  pedidoId: string;
  pedidoNumber: number;
  cliente: FiscalClientePayload;
  itens: PedidoItemLike[];
}

export interface EmissaoPorTipo {
  tipo: "nfe" | "nfse";
  resultado: FiscalEmissaoResultado;
}

/**
 * Núcleo PURO (sem banco) da emissão de nota fiscal de um pedido: separa
 * os itens por tipo de operação (`domain.ts#splitItensPorOperacao`),
 * monta um `FiscalEmissaoPayload` por grupo e chama o `FiscalProvider`
 * injetado — nunca deixa uma exceção do provider escapar (vira
 * `{ status: "erro", errorMessage }`, exatamente o formato que
 * `actions.ts#emitirNotaFiscal` grava em `fiscal_notas` sem quebrar o
 * pedido). Extraído de `actions.ts` (que só faz I/O de banco em cima
 * disto) para ser testável com um provider fake, sem Postgres — ver
 * `__tests__/provider.fake.ts` e `__tests__/run-emissao.test.ts`.
 */
export async function runEmissaoParaPedido(
  input: RunEmissaoInput,
  provider: FiscalProvider,
): Promise<EmissaoPorTipo[]> {
  const { venda, servico } = splitItensPorOperacao(input.itens);

  const grupos: Array<{ tipo: "nfe" | "nfse"; itens: PedidoItemLike[] }> = [];
  if (venda.length > 0) grupos.push({ tipo: "nfe", itens: venda });
  if (servico.length > 0) grupos.push({ tipo: "nfse", itens: servico });

  const resultados: EmissaoPorTipo[] = [];
  for (const grupo of grupos) {
    const payload: FiscalEmissaoPayload = {
      organizationId: input.organizationId,
      pedidoId: input.pedidoId,
      pedidoNumber: input.pedidoNumber,
      cliente: input.cliente,
      itens: grupo.itens.map(buildFiscalItemPayload),
      valorTotalCents: grupo.itens.reduce(
        (total, item) => total + Math.round(item.unitPriceCents * Number(item.quantity)),
        0,
      ),
    };

    let resultado: FiscalEmissaoResultado;
    try {
      resultado =
        grupo.tipo === "nfe"
          ? await provider.emitirNFe(payload)
          : await provider.emitirNFSe(payload);
    } catch (err) {
      resultado = {
        status: "erro",
        errorMessage: err instanceof Error ? err.message : "Falha desconhecida do provedor.",
      };
    }
    resultados.push({ tipo: grupo.tipo, resultado });
  }

  return resultados;
}

/**
 * Núcleo puro do cancelamento de uma nota — mesma ideia de
 * `runEmissaoParaPedido`: nunca deixa o provider lançar, sempre devolve
 * um `FiscalCancelamentoResultado`. `providerNotaId` ausente (nota nunca
 * chegou a ser emitida de verdade — ex.: veio do
 * `NaoConfiguradoFiscalProvider`) é tratado como falha de validação, sem
 * nem chamar o provider.
 */
export async function runCancelamento(
  providerNotaId: string | null | undefined,
  motivo: string,
  provider: FiscalProvider,
): Promise<FiscalCancelamentoResultado> {
  if (!providerNotaId) {
    return {
      ok: false,
      errorMessage: "Nota sem identificador do provedor — não é possível cancelar.",
    };
  }

  try {
    return await provider.cancelar(providerNotaId, motivo);
  } catch (err) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : "Falha desconhecida do provedor.",
    };
  }
}
