"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/core/supabase/client";

/**
 * Segunda etapa do "esqueci minha senha" — chega aqui pelo link do
 * e-mail que o Supabase manda (`resetPasswordForEmail`, ver
 * `(auth)/actions.ts#requestPasswordReset`). O link carrega um token de
 * recuperação no hash da própria URL; o cliente Supabase do NAVEGADOR
 * (`createSupabaseBrowserClient`, `detectSessionInUrl` ligado por
 * padrão) processa isso sozinho ao carregar a página e cria uma sessão
 * temporária — por isso este form roda inteiramente no CLIENTE
 * (`supabase.auth.updateUser`), não como Server Action: o servidor nunca
 * vê essa sessão de recuperação, ela vive só no navegador até aqui.
 *
 * Se o link já expirou/foi usado, não existe sessão de recuperação
 * nenhuma e `updateUser` falha — tratado como o erro genérico abaixo
 * (mensagem já orienta a pedir um link novo).
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsPending(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setIsPending(false);
      setError(
        'Não foi possível redefinir a senha — o link pode ter expirado ou já ter sido usado. Peça um novo em "Esqueci minha senha".',
      );
      return;
    }

    // A sessão de recuperação já autentica a pessoa — desloga de
    // propósito e manda pro login, pra ela entrar de novo já com a
    // senha nova (mais claro do que cair direto logada sem confirmar).
    await supabase.auth.signOut();
    toast.success("Senha redefinida — entre com a senha nova.");
    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isPending}
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
