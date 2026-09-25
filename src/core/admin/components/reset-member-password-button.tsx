"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { resetMemberPassword } from "../actions";

/**
 * Reset de senha pelo dono da plataforma (área `/admin`) — usado quando
 * alguém esquece a senha e não consegue (ou não sabe) usar "Esqueci
 * minha senha" sozinha. Gera uma senha PROVISÓRIA aleatória
 * (`actions.ts#resetMemberPassword`), mostrada uma única vez nesta
 * tela — não fica salva em lugar nenhum além do que o admin copiar/
 * anotar. A pessoa entra com ela e troca por uma definitiva depois
 * (fluxo de autoatendimento em `/esqueci-senha`, mesmo e-mail).
 */
export function ResetMemberPasswordButton({
  organizationId,
  userId,
  email,
}: {
  organizationId: string;
  userId: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  function handleConfirm() {
    startTransition(async () => {
      const result = await resetMemberPassword(organizationId, userId);
      if (result.ok && result.temporaryPassword) {
        setTemporaryPassword(result.temporaryPassword);
      } else {
        toast.error(result.message ?? "Não foi possível resetar a senha.");
      }
    });
  }

  async function handleCopy() {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      toast.success("Senha copiada.");
    } catch {
      toast.error("Não foi possível copiar — selecione o texto manualmente.");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Limpa ao fechar — a senha já foi mostrada/copiada, não precisa
    // continuar em memória depois que o dialog some.
    if (!next) setTemporaryPassword(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <KeyRound className="h-4 w-4" />
        Resetar senha
      </DialogTrigger>
      <DialogContent>
        {temporaryPassword ? (
          <>
            <DialogHeader>
              <DialogTitle>Senha provisória gerada</DialogTitle>
              <DialogDescription>
                Repasse esta senha para {email} por um canal seguro (WhatsApp, telefone) — ela só
                aparece agora, não fica salva em lugar nenhum. Peça para a pessoa entrar com ela e
                trocar assim que possível, usando &quot;Esqueci minha senha&quot; na tela de login
                (mesmo e-mail).
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <code className="bg-muted flex-1 rounded-md px-3 py-2 font-mono text-sm select-all">
                {temporaryPassword}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                aria-label="Copiar senha"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Fechar</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Resetar senha de {email}</DialogTitle>
              <DialogDescription>
                Gera uma senha provisória aleatória e substitui a atual imediatamente — a pessoa não
                vai mais conseguir entrar com a senha antiga. Essa ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} disabled={isPending}>
                {isPending ? "Gerando..." : "Gerar senha provisória"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
