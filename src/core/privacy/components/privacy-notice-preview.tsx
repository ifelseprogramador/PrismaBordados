"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LGPD_MIN_RETENTION_YEARS, type PrivacySettings } from "../types";

/** Mesmo texto-base de `app/privacidade/page.tsx`, mas com os campos já
 * preenchidos a partir de `PrivacySettings` em vez de `[PREENCHER]`
 * estático — ver `app/(app)/lgpd/page.tsx`. */
function buildNoticeText(settings: PrivacySettings, organizationName: string): string {
  const empresa = settings.legalName || organizationName;
  const cnpj = settings.cnpj || "[CNPJ não cadastrado]";
  const endereco = settings.address || "[endereço não cadastrado]";
  const dpoNome = settings.dpoName || "[encarregado não cadastrado]";
  const dpoContato = settings.dpoContact || "[contato não cadastrado]";

  return `AVISO DE PRIVACIDADE

1. Quem somos
${empresa}, CNPJ ${cnpj}, com endereço em ${endereco}, é a controladora dos dados pessoais tratados neste aviso.

2. Quais dados coletamos e por quê
Coletamos nome, CPF/CNPJ, telefone, endereço e, opcionalmente, e-mail de clientes que contratam nossos serviços. Usamos esses dados para produzir e entregar o pedido contratado e para emitir a nota fiscal correspondente.
Base legal: execução de contrato (LGPD, Art. 7º, V) e cumprimento de obrigação legal (Art. 7º, II).

3. Por quanto tempo guardamos
Pedidos com nota fiscal emitida são guardados por ${settings.retentionYears} ano(s) (mínimo legal: ${LGPD_MIN_RETENTION_YEARS} anos, prescrição tributária — CTN, Art. 173/174), mesmo que o cliente solicite a eliminação dos seus dados antes disso.

4. Seus direitos
Você pode solicitar acesso, correção, portabilidade ou eliminação dos seus dados pessoais pelo contato abaixo. Se você já tiver pedidos registrados conosco, a eliminação anonimiza seu cadastro, mas o histórico do pedido em si é mantido pelo prazo do item 3.

5. Encarregado de dados (DPO) e contato
${dpoNome} — ${dpoContato}
`;
}

export function PrivacyNoticePreview({
  settings,
  organizationName,
}: {
  settings: PrivacySettings;
  organizationName: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = buildNoticeText(settings, organizationName);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Texto copiado.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar automaticamente — selecione o texto manualmente.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <pre className="bg-muted/50 max-h-96 overflow-auto rounded-md p-4 text-xs whitespace-pre-wrap">
        {text}
      </pre>
      <Button variant="outline" onClick={handleCopy} className="self-start">
        <Copy className="h-4 w-4" />
        {copied ? "Copiado!" : "Copiar texto"}
      </Button>
    </div>
  );
}
