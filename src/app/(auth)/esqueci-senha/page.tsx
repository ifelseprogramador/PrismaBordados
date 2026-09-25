import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function EsqueciSenhaPage() {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader>
          <CardTitle>Esqueci minha senha</CardTitle>
          <CardDescription>
            Informe o e-mail da sua conta — enviamos um link para você criar uma senha nova.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
      <Link
        href="/login"
        className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 text-center text-xs underline"
      >
        <ArrowLeft className="h-3 w-3" />
        Voltar para o login
      </Link>
    </div>
  );
}
