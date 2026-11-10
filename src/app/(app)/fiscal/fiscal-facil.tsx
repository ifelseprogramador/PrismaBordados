import { CheckCircle2, ClipboardList, Receipt, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FacilPage } from "@/components/facil/facil-page";
import { FacilActions, FacilTile } from "@/components/facil/facil-tile";
import { FiscalCredentialsForm, getFiscalCredentialsSummary } from "@/modules/fiscal";

/**
 * Fiscal no modo Fácil: diz com todas as letras se a emissão de notas já está
 * configurada, leva para os pedidos entregues (onde a nota é de fato emitida) e
 * deixa a configuração — um formulário técnico, de uso raro — logo abaixo, no
 * formulário formal.
 */
export async function FiscalFacil() {
  const summary = await getFiscalCredentialsSummary();
  const ok = Boolean(summary);

  return (
    <FacilPage
      title="Notas fiscais"
      subtitle="Configuração para emitir NF-e e NFS-e"
      icon={Receipt}
      backHref="/"
      backLabel="Início"
    >
      <div className="bg-card flex flex-col items-center gap-3 rounded-2xl p-6 text-center ring-1 ring-black/5 dark:ring-white/10">
        <span
          className={
            ok
              ? "rounded-full bg-emerald-100 p-4 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "rounded-full bg-amber-100 p-4 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          }
        >
          {ok ? <CheckCircle2 className="h-10 w-10" /> : <TriangleAlert className="h-10 w-10" />}
        </span>
        <p className="text-xl font-semibold">
          {ok
            ? "A emissão de notas está configurada"
            : "A emissão de notas ainda não está configurada"}
        </p>
        <p className="text-muted-foreground max-w-md text-sm">
          A nota é emitida na ficha do pedido, depois que ele for marcado como entregue.
        </p>
      </div>

      <FacilActions>
        <FacilTile
          href="/pedidos?status=entregue"
          label="Pedidos entregues"
          icon={ClipboardList}
          size="lg"
          index={0}
        />
      </FacilActions>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração do provedor</CardTitle>
        </CardHeader>
        <CardContent>
          <FiscalCredentialsForm summary={summary} />
        </CardContent>
      </Card>
    </FacilPage>
  );
}
