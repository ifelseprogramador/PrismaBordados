import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requireEnv } from "@/core/env";

// `/privacidade` precisa ser pública por exigência da própria LGPD — um
// aviso de privacidade que só quem já tem login consegue ler não cumpre
// a finalidade de informar o titular antes/independente do cadastro. Ver
// docs/lgpd-checklist.md.
//
// `/redefinir-senha` PRECISA ser pública mesmo sendo, na prática, "a
// pessoa provando quem é" — o token de recuperação que autentica ali
// vive só no hash da URL, processado pelo cliente Supabase do
// NAVEGADOR (`createSupabaseBrowserClient`) depois que a página já
// carregou. Este middleware roda ANTES disso, no servidor, e não teria
// como ver essa sessão ainda — sem estar na lista, o próprio link do
// e-mail de recuperação cairia num redirect pro /login antes da página
// ter a chance de processar o token. Ver
// `(auth)/redefinir-senha/reset-password-form.tsx`.
const PUBLIC_PATHS = ["/login", "/privacidade", "/esqueci-senha", "/redefinir-senha"];

/**
 * Renova a sessão do Supabase a cada request e redireciona para /login
 * quando não há usuário autenticado. Chamado a partir de `proxy.ts` (o
 * antigo `middleware.ts`, renomeado no Next 16).
 *
 * `requestHeaders`, quando informado, substitui os headers originais da
 * request nas respostas geradas aqui — é como `proxy.ts` propaga o
 * `x-request-id` para o restante do pipeline (Server Components/Actions).
 */
export async function updateSession(
  request: NextRequest,
  requestHeaders: Headers = request.headers,
) {
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request: { headers: requestHeaders } });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANTE: não remover este `getUser()`. É ele quem de fato valida o
  // token junto ao Supabase Auth e dispara o refresh do cookie de sessão.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}
