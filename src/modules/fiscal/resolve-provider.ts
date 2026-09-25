import type {
  FiscalArquivo,
  FiscalCancelamentoResultado,
  FiscalConsultaResultado,
  FiscalEmissaoPayload,
  FiscalEmissaoResultado,
  FiscalProvider,
} from "./provider";

const MENSAGEM_NAO_CONFIGURADO =
  "Nenhum provedor de emissão fiscal configurado para esta organização. " +
  "Configure um provedor em Fiscal > Configurações antes de emitir notas.";

/**
 * Provider "fail-safe" usado quando `fiscal_credentials.providerSlug`
 * está vazio/null (ou aponta para um slug desconhecido) — o estado
 * padrão de toda organização até contratar um provedor real (decisão
 * adiada pelo usuário, ver docs/decisoes.md). NUNCA lança para os
 * métodos de emissão/consulta/cancelamento — sempre devolve um resultado
 * de erro amigável, pra "emitir nota" nunca quebrar o fluxo do pedido
 * (ver `actions.ts#emitirNotaFiscal`, que grava esse erro em
 * `fiscal_notas.errorMessage` em vez de deixar a Server Action falhar).
 * `baixarPdf`/`baixarXml` lançam (não há nada plausível pra devolver como
 * "arquivo" quando nunca houve emissão) — quem chama já checa
 * `status === 'emitida'` antes de oferecer o link de download.
 */
class NaoConfiguradoFiscalProvider implements FiscalProvider {
  async emitirNFe(_payload: FiscalEmissaoPayload): Promise<FiscalEmissaoResultado> {
    return { status: "erro", errorMessage: MENSAGEM_NAO_CONFIGURADO };
  }

  async emitirNFSe(_payload: FiscalEmissaoPayload): Promise<FiscalEmissaoResultado> {
    return { status: "erro", errorMessage: MENSAGEM_NAO_CONFIGURADO };
  }

  async consultar(_notaId: string): Promise<FiscalConsultaResultado> {
    return { status: "erro", errorMessage: MENSAGEM_NAO_CONFIGURADO };
  }

  async cancelar(_notaId: string, _motivo: string): Promise<FiscalCancelamentoResultado> {
    return { ok: false, errorMessage: MENSAGEM_NAO_CONFIGURADO };
  }

  async baixarPdf(_notaId: string): Promise<FiscalArquivo> {
    throw new Error(MENSAGEM_NAO_CONFIGURADO);
  }

  async baixarXml(_notaId: string): Promise<FiscalArquivo> {
    throw new Error(MENSAGEM_NAO_CONFIGURADO);
  }
}

/**
 * Resolve, em runtime, qual `FiscalProvider` usar para uma organização, a
 * partir de `fiscal_credentials.providerSlug`. NENHUM provedor real está
 * implementado nesta fase — todo `providerSlug` (vazio, null, ou
 * qualquer valor, já que nenhum foi escolhido ainda) cai no
 * `NaoConfiguradoFiscalProvider`.
 *
 * Quando um provedor real for contratado, este `switch` ganha um `case`
 * que importa a implementação concreta correspondente (que deve viver
 * fora deste arquivo, ex. `modules/fiscal/providers/<slug>.ts`, nunca
 * aqui) — o resto do sistema não muda uma linha, porque só conhece a
 * interface `FiscalProvider`.
 */
export function resolveFiscalProvider(providerSlug: string | null | undefined): FiscalProvider {
  switch (providerSlug) {
    default:
      return new NaoConfiguradoFiscalProvider();
  }
}
