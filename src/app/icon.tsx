import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Ícone da aba do navegador — mesma marca da tela de login (`Gem` do
 * lucide-react num quadrado arredondado na cor primária do tema).
 * Gerado em build/runtime (`next/og`), não um arquivo estático: um
 * `<svg>` só aceita os elementos que o `satori` entende, por isso o
 * ícone é montado na mão aqui (path copiado de
 * `node_modules/lucide-react/dist/esm/icons/gem.mjs`) em vez de
 * importar o componente `Gem` direto.
 */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#195cc7",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.5 3 8 9l4 13 4-13-2.5-6" />
        <path d="M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z" />
        <path d="M2 9h20" />
      </svg>
    </div>,
    { ...size },
  );
}
