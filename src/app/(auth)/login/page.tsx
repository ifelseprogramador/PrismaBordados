import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse o painel da sua organização.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
      <Link
        href="/privacidade"
        className="text-muted-foreground hover:text-foreground text-center text-xs underline"
      >
        Aviso de privacidade
      </Link>
    </div>
  );
}
