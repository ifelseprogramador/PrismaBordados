"use client";

/**
 * Só entra em ação se o PRÓPRIO `layout.tsx` raiz quebrar (ex.: erro
 * carregando fonte, erro no provider de tema) — `error.tsx` normal não
 * cobre esse caso, porque ele fica DENTRO do layout que quebrou. Por
 * isso precisa do próprio `<html>`/`<body>` e não pode depender de
 * nenhum componente do app (Tailwind/tema podem ser parte do que
 * quebrou) — estilo inline de propósito, não um bug de convenção.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: "24rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Algo deu errado</h1>
          <p style={{ color: "#666", marginTop: "0.5rem" }}>
            Não foi possível carregar o sistema. O erro já foi registrado.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
