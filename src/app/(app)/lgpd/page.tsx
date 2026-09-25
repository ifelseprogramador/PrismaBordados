import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveOrg, withOrg } from "@/core/auth";
import { getPrivacySettings } from "@/core/privacy/settings";
import { PrivacySettingsForm } from "@/core/privacy/components/privacy-settings-form";
import { PrivacyNoticePreview } from "@/core/privacy/components/privacy-notice-preview";

/**
 * Configurações de LGPD por organização (cada organização do Prisma é
 * uma empresa de bordado diferente, controladora dos dados dos PRÓPRIOS
 * clientes — não faz sentido um único texto fixo servir todas). Ver
 * docs/lgpd-checklist.md.
 */
export default async function LgpdSettingsPage() {
  const { organizationId, withDb } = await withOrg();
  const [{ organizationName }, settings] = await Promise.all([
    getActiveOrg(),
    withDb((tx) => getPrivacySettings(tx, organizationId)),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Privacidade (LGPD)</h1>
        <p className="text-muted-foreground text-sm">
          Dados da sua organização usados no aviso de privacidade que você entrega aos seus próprios
          clientes (impresso, no seu site, WhatsApp Business, etc. — o Prisma é um sistema interno,
          não publica isso automaticamente num site público).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da empresa e do encarregado</CardTitle>
          <CardDescription>
            {organizationName} — visível só para quem tem acesso a este painel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PrivacySettingsForm settings={settings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aviso de privacidade gerado</CardTitle>
          <CardDescription>
            Preenchido automaticamente com os dados salvos acima. Copie e use no lugar onde seus
            clientes precisam encontrá-lo — este texto ainda vale a revisão de um advogado antes de
            publicar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PrivacyNoticePreview settings={settings} organizationName={organizationName} />
        </CardContent>
      </Card>
    </div>
  );
}
