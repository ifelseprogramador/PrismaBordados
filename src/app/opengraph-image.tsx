import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagem mostrada ao compartilhar um link do sistema (WhatsApp,
 * Slack, Twitter/X, etc. — todos leem a meta tag `og:image`, que o
 * Next.js gera sozinho a partir deste arquivo). Mesma marca da tela de
 * login: ícone + nome + slogan, sobre o fundo escuro do tema.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        background: "#0a0a0f",
      }}
    >
      <div
        style={{
          width: 160,
          height: 160,
          background: "#195cc7",
          borderRadius: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="96"
          height="96"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.5 3 8 9l4 13 4-13-2.5-6" />
          <path d="M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z" />
          <path d="M2 9h20" />
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 72, fontWeight: 700, color: "white" }}>Prisma</div>
        <div style={{ fontSize: 30, color: "#9ca3af" }}>Gestão completa para o seu negócio</div>
      </div>
    </div>,
    { ...size },
  );
}
