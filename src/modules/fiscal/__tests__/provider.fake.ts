import type {
  FiscalArquivo,
  FiscalCancelamentoResultado,
  FiscalConsultaResultado,
  FiscalEmissaoPayload,
  FiscalEmissaoResultado,
  FiscalProvider,
} from "../provider";

/**
 * Provider fake para teste ponta a ponta do fluxo fiscal, sem rede nem
 * credenciais reais — a única implementação de `FiscalProvider` que
 * existe nesta fase (nenhum provedor real é implementado, ver
 * docs/decisoes.md). Serve também de referência de CONTRATO para quem
 * implementar um provider de verdade no futuro: cada método precisa
 * devolver exatamente esse formato, nunca lançar por conta própria (quem
 * quiser simular uma falha de rede deve configurar `throwOn`, abaixo —
 * `run-emissao.ts`/`actions.ts` já tratam esse `throw` sem quebrar o
 * pedido).
 */
export class FakeFiscalProvider implements FiscalProvider {
  emitidas: { tipo: "nfe" | "nfse"; payload: FiscalEmissaoPayload }[] = [];
  cancelamentos: { notaId: string; motivo: string }[] = [];
  private counter = 0;

  /** Quando definido, o método correspondente LANÇA em vez de devolver
   * (simula uma falha de rede/timeout do provedor real). */
  throwOn: Partial<Record<keyof FiscalProvider, boolean>> = {};

  private nextId(): string {
    this.counter += 1;
    return `fake-nota-${this.counter}`;
  }

  async emitirNFe(payload: FiscalEmissaoPayload): Promise<FiscalEmissaoResultado> {
    if (this.throwOn.emitirNFe) throw new Error("Falha simulada de rede (NF-e).");
    this.emitidas.push({ tipo: "nfe", payload });
    const providerNotaId = this.nextId();
    return {
      status: "emitida",
      providerNotaId,
      xmlUrl: `https://fake-provider.test/notas/${providerNotaId}.xml`,
      pdfUrl: `https://fake-provider.test/notas/${providerNotaId}.pdf`,
    };
  }

  async emitirNFSe(payload: FiscalEmissaoPayload): Promise<FiscalEmissaoResultado> {
    if (this.throwOn.emitirNFSe) throw new Error("Falha simulada de rede (NFS-e).");
    this.emitidas.push({ tipo: "nfse", payload });
    const providerNotaId = this.nextId();
    return {
      status: "emitida",
      providerNotaId,
      xmlUrl: `https://fake-provider.test/notas/${providerNotaId}.xml`,
      pdfUrl: `https://fake-provider.test/notas/${providerNotaId}.pdf`,
    };
  }

  async consultar(notaId: string): Promise<FiscalConsultaResultado> {
    if (this.throwOn.consultar) throw new Error("Falha simulada de rede (consulta).");
    return {
      status: "emitida",
      xmlUrl: `https://fake-provider.test/notas/${notaId}.xml`,
      pdfUrl: `https://fake-provider.test/notas/${notaId}.pdf`,
    };
  }

  async cancelar(notaId: string, motivo: string): Promise<FiscalCancelamentoResultado> {
    if (this.throwOn.cancelar) throw new Error("Falha simulada de rede (cancelamento).");
    this.cancelamentos.push({ notaId, motivo });
    return { ok: true };
  }

  async baixarPdf(notaId: string): Promise<FiscalArquivo> {
    if (this.throwOn.baixarPdf) throw new Error("Falha simulada de rede (PDF).");
    return { url: `https://fake-provider.test/notas/${notaId}.pdf` };
  }

  async baixarXml(notaId: string): Promise<FiscalArquivo> {
    if (this.throwOn.baixarXml) throw new Error("Falha simulada de rede (XML).");
    return { url: `https://fake-provider.test/notas/${notaId}.xml` };
  }
}
