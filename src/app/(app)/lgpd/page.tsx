import { FileText, ShieldCheck } from "lucide-react";
import { ModePage, ModeSection } from "@/components/facil/mode-layout";
import { getCurrentUiMode } from "@/core/profile/current-ui-mode";
import { getActiveOrg, requireOwner } from "@/core/auth";
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
  const { organizationId, withDb } = await requireOwner();
  const [{ organizationName }, settings] = await Promise.all([
    getActiveOrg(),
    withDb((tx) => getPrivacySettings(tx, organizationId)),
  ]);

  const uiMode = await getCurrentUiMode();

  return (
    <ModePage
      mode={uiMode}
      title="Privacidade (LGPD)"
      subtitle="Dados da sua organização usados no aviso de privacidade que você entrega aos seus próprios clientes (impresso, no seu site, WhatsApp Business, etc. — o Prisma é um sistema interno, não publica isso automaticamente num site público)."
      icon={ShieldCheck}
    >
      <ModeSection
        mode={uiMode}
        title="Dados da empresa e do encarregado"
        description={`${organizationName} — visível só para quem tem acesso a este painel.`}
        icon={ShieldCheck}
      >
        <PrivacySettingsForm settings={settings} />
      </ModeSection>

      <ModeSection
        mode={uiMode}
        title="Aviso de privacidade gerado"
        description="Preenchido automaticamente com os dados salvos acima. Copie e use no lugar onde seus clientes precisam encontrá-lo — este texto ainda vale a revisão de um advogado antes de publicar."
        icon={FileText}
      >
        <PrivacyNoticePreview settings={settings} organizationName={organizationName} />
      </ModeSection>
    </ModePage>
  );
}
