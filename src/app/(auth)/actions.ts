"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { z } from "zod";
import { createSupabaseServerClient } from "@/core/supabase/server";
import { logger } from "@/core/logger";
import { IMPERSONATION_COOKIE } from "@/core/impersonation";
import { isPlatformAdmin } from "@/core/platform-admin";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

export interface LoginState {
  error?: string;
}

async function getRequestId(): Promise<string | undefined> {
  const headerList = await headers();
  return headerList.get("x-request-id") ?? undefined;
}

/** Origem (`https://dominio.com`) a partir dos headers da própria
 * request — não existe `NEXT_PUBLIC_SITE_URL` neste projeto (ver
 * `core/env.ts`), então deriva do host real que serviu a request em vez
 * de fixar um domínio. `x-forwarded-proto`/`x-forwarded-host` são os
 * headers que o Vercel (e qualquer proxy reverso) usa; `host` é o
 * fallback de dev local (`npm run dev`, sem proxy na frente). */
async function getSiteOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const requestId = await getRequestId();
  const log = logger.withContext({ requestId, module: "auth", action: "login" });

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    log.warn("auth.login.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { error: "Preencha e-mail e senha corretamente." };
  }

  const supabase = await createSupabaseServerClient();
  const { error, data } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    log.warn("auth.login.negado", { reason: error.message });
    return { error: "E-mail ou senha inválidos." };
  }

  log.info("auth.login.sucesso", { userId: data.user?.id });

  // Dono da plataforma cai direto no painel administrativo, não no app
  // da organização — ele pode não ter (ou não usar) nenhuma organização.
  if (data.user && (await isPlatformAdmin(data.user.id))) {
    redirect("/admin");
  }

  redirect("/");
}

export async function logout() {
  const requestId = await getRequestId();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.auth.signOut();
  (await cookies()).delete(IMPERSONATION_COOKIE);

  logger.withContext({ requestId, module: "auth", action: "logout" }).info("auth.logout", {
    userId: user?.id,
  });

  redirect("/login");
}

const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").email("E-mail inválido."),
});

export interface ForgotPasswordState {
  error?: string;
  sent?: boolean;
}

/**
 * Autoatendimento — dispara o e-mail de recuperação do próprio Supabase
 * Auth (nenhuma infraestrutura de e-mail própria neste sistema). Sempre
 * responde com a mesma mensagem de sucesso, exista ou não o e-mail —
 * nunca confirma/nega se um endereço tem conta (evita enumeração de
 * usuário). `redirectTo` aponta pra `/redefinir-senha`, que troca a
 * senha de verdade depois que a pessoa clica no link do e-mail — ver
 * esse arquivo pro resto do fluxo.
 *
 * PRÉ-REQUISITO fora do código: a URL completa (`origin +
 * /redefinir-senha`) precisa estar na lista de "Redirect URLs" do
 * projeto Supabase (Authentication -> URL Configuration) — sem isso o
 * Supabase recusa o `redirectTo` e o link do e-mail não funciona.
 */
export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const requestId = await getRequestId();
  const log = logger.withContext({ requestId, module: "auth", action: "esqueci_senha" });

  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    log.warn("auth.esqueci_senha.validacao_falhou");
    return { error: "Informe um e-mail válido." };
  }

  const origin = await getSiteOrigin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/redefinir-senha`,
  });

  if (error) {
    // Ainda assim devolve `sent: true` pro chamador — ver comentário
    // acima sobre nunca confirmar/negar existência de e-mail. Só loga o
    // erro real pra investigação (ex.: Supabase fora do ar).
    log.error("auth.esqueci_senha.falhou", { err: error });
  } else {
    log.info("auth.esqueci_senha.solicitado");
  }

  return { sent: true };
}
