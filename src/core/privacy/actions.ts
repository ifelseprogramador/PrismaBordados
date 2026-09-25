"use server";

import { revalidatePath } from "next/cache";
import { withOrg } from "@/core/auth";
import type { ActionResult } from "@/core/action-result";
import { setPrivacySettings } from "./settings";
import { parsePrivacySettingsFormData } from "./validation";

export async function updatePrivacySettings(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { organizationId, log, withDb } = await withOrg();

  const parsed = parsePrivacySettingsFormData(formData);
  if (!parsed.success) {
    log.warn("privacidade.configurar.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  await withDb((tx) => setPrivacySettings(tx, organizationId, parsed.data));

  log.info("privacidade.configurar.sucesso");
  revalidatePath("/lgpd");
  return { ok: true };
}
