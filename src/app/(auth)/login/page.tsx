import Link from "next/link";
import { Gem, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

/**
 * Tela de entrada do sistema — a primeira coisa que qualquer pessoa vê
 * (`/` sem sessão redireciona pra cá, ver `PUBLIC_PATHS` em
 * `core/supabase/middleware.ts`). Marca (ícone + nome + slogan) +
 * selo de conexão segura antes de só cair direto no formulário — pedido
 * do usuário pra passar mais profissionalismo/confiança logo de cara,
 * já que é multi-tenant (várias empresas de bordado diferentes confiam
 * os próprios dados a este login).
 */
export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="bg-primary text-primary-foreground flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm">
          <Gem className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prisma</h1>
          <p className="text-muted-foreground text-sm">Gestão completa para empresas de bordado</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse o painel da sua organização.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>

      <div className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>Conexão segura — seus dados ficam protegidos</span>
      </div>

      <Link
        href="/privacidade"
        className="text-muted-foreground hover:text-foreground text-center text-xs underline"
      >
        Aviso de privacidade
      </Link>
    </div>
  );
}
