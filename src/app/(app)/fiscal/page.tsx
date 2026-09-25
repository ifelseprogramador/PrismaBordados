import { Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFiscalCredentialsSummary, FiscalCredentialsForm } from "@/modules/fiscal";

export default async function FiscalPage() {
  const summary = await getFiscalCredentialsSummary();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Receipt className="text-primary h-6 w-6" />
        <h1 className="text-2xl font-semibold tracking-tight">Fiscal</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração do provedor</CardTitle>
        </CardHeader>
        <CardContent>
          <FiscalCredentialsForm summary={summary} />
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-sm">
        Nenhum provedor de emissão (NF-e/NFS-e) está integrado ainda — essa escolha fica em aberto
        (ver docs/decisoes.md). Emitir notas de um pedido continua disponível a partir da própria
        página do pedido, uma vez marcado como entregue; sem provedor configurado, a emissão devolve
        um erro amigável em vez de quebrar.
      </p>
    </div>
  );
}
