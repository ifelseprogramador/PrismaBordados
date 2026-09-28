"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/core/action-result";
import { resetOrganizationColor, resetSidebarColor, updateOrganizationBranding } from "../actions";

const initialState: ActionResult = { ok: false };

/** Um seletor de cor com botão "Restaurar padrão" próprio — reaproveitado
 * pra cor de destaque e cor do menu lateral, que são overrides
 * independentes (ver `components/org-branding-style.tsx`). */
function ColorPickerField({
  name,
  label,
  helpText,
  color,
  onReset,
  error,
}: {
  name: string;
  label: string;
  helpText: string;
  color: string | null;
  onReset: () => void;
  error?: string[];
}) {
  const [isResetting, startReset] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        {/* `key` força o input a remontar quando `color` muda via
            revalidação do server (ex.: depois de restaurar) — um input
            `type="color"` não controlado não reflete um novo
            `defaultValue` sozinho. */}
        <Input
          key={color ?? "default"}
          id={name}
          name={name}
          type="color"
          defaultValue={color ?? "#2563eb"}
          className="h-10 w-16 p-1"
        />
        <span className="text-muted-foreground text-sm">{helpText}</span>
        {color && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isResetting}
            onClick={() => startReset(onReset)}
          >
            <RotateCcw className="h-4 w-4" />
            {isResetting ? "Restaurando..." : "Restaurar padrão"}
          </Button>
        )}
      </div>
      {error?.map((e) => (
        <p key={e} className="text-destructive text-sm">
          {e}
        </p>
      ))}
    </div>
  );
}

export function BrandingForm({
  primaryColor,
  sidebarColor,
  logoUrl,
}: {
  primaryColor: string | null;
  sidebarColor: string | null;
  logoUrl: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updateOrganizationBranding, initialState);
  const errors = state.errors ?? {};
  const [preview, setPreview] = useState<string | null>(logoUrl);

  useEffect(() => {
    if (state.ok) toast.success("Aparência atualizada.");
  }, [state]);

  async function handleResetPrimary() {
    const result = await resetOrganizationColor();
    if (result.ok) {
      toast.success("Cor de destaque restaurada para o padrão do sistema.");
    } else {
      toast.error(result.message ?? "Não foi possível restaurar a cor.");
    }
  }

  async function handleResetSidebar() {
    const result = await resetSidebarColor();
    if (result.ok) {
      toast.success("Cor do menu lateral restaurada para o padrão do sistema.");
    } else {
      toast.error(result.message ?? "Não foi possível restaurar a cor.");
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <ColorPickerField
        name="primaryColor"
        label="Cor de destaque (botões)"
        helpText="Aplicada nos botões e destaques em todo o sistema."
        color={primaryColor}
        onReset={handleResetPrimary}
        error={errors.primaryColor}
      />

      <ColorPickerField
        name="sidebarColor"
        label="Cor do menu lateral"
        helpText="Fundo do menu à esquerda — o texto se ajusta sozinho pra continuar legível."
        color={sidebarColor}
        onReset={handleResetSidebar}
        error={errors.sidebarColor}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="logo">Logo</Label>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, fora do domínio de imagens do Next.
          <img
            src={preview}
            alt="Logo atual"
            // `self-start`: sem isso, o container flex-col (align-items:
            // stretch por padrão) esticava a imagem pra largura total,
            // deformando ela — `w-auto` sozinho não basta porque
            // `width: auto` ainda conta como "auto" pro stretch do flex.
            className="h-12 w-auto self-start rounded border bg-white object-contain p-1"
          />
        )}
        <Input
          id="logo"
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPreview(URL.createObjectURL(file));
          }}
        />
        <p className="text-muted-foreground text-sm">PNG, JPG, SVG ou WebP, até 2 MB.</p>
        {errors.logo?.map((e) => (
          <p key={e} className="text-destructive text-sm">
            {e}
          </p>
        ))}
      </div>

      {state.message && <p className="text-destructive text-sm">{state.message}</p>}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar aparência"}
        </Button>
      </div>
    </form>
  );
}
