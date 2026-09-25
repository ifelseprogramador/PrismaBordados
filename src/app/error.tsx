"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/core/logger";

/**
 * Fallback de erro pra qualquer segmento sem `error.tsx` mais específico
 * — antes desta entrega, não existia NENHUM: um erro inesperado numa
 * página derrubava pra tela genérica do Next.js, sem "tentar de novo" e
 * sem nada explicando o que aconteceu. `error.tsx` roda no CLIENTE
 * (Client Component obrigatório — ver node_modules/next/dist/docs/.../
 * error.md, Next 16); o registro do lado do servidor (com
 * `requestId`/rota) já aconteceu por `instrumentation.ts#onRequestError`
 * antes de chegar aqui — o `logger.error` abaixo é só pra aparecer no
 * console do navegador durante desenvolvimento (`core/logger.ts` já
 * decide sozinho o que escreve por ambiente), nunca `console.*` direto
 * (bloqueado por lint fora de `core/logger.ts`).
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("app.error_boundary", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="bg-destructive/10 text-destructive mb-2 flex h-10 w-10 items-center justify-center rounded-lg">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <CardTitle>Algo deu errado</CardTitle>
          <CardDescription>
            Não foi possível carregar esta página. O erro já foi registrado — se continuar
            acontecendo, entre em contato com o suporte.
            {error.digest && (
              <span className="mt-2 block font-mono text-xs">Código: {error.digest}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => reset()}>Tentar de novo</Button>
        </CardContent>
      </Card>
    </div>
  );
}
