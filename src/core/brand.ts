/**
 * Configuração de marca do vertical — o ÚNICO arquivo que muda entre o
 * BaseERP e cada vertical nascido dele (Prisma, e os que vierem depois)
 * nos pontos de UI compartilhados (sidebar, header, favicon, imagem de
 * compartilhamento, tela de login). Todo o resto desses arquivos é
 * idêntico entre os projetos de propósito — é o que permite sincronizar
 * `core/`/`components/`/`app/(auth)`/`app/(app)/layout.tsx` automaticamente
 * (`base-erp/scripts/sync-to-vertical.sh` + hook `post-commit`, ver
 * `base-erp/scripts/foundation-paths.sh`) sem apagar a identidade visual
 * de ninguém — este arquivo está em `FOUNDATION_EXCLUDE_PATHS`, nunca é
 * sobrescrito pela sincronização automática.
 *
 * Ao nascer um vertical novo a partir deste template: o ÚNICO arquivo
 * que precisa mudar aqui é este. Nunca edite `iconPaths` copiando de
 * qualquer ícone lucide-react (`node_modules/lucide-react/dist/esm/icons/<nome>.mjs`,
 * campo `node`) — os `d` de cada `<path>`, em ordem, viewBox 24x24.
 */
export interface BrandConfig {
  name: string;
  tagline: string;
  /** Cor primária em hex — mesma cor de `--primary` em `globals.css`
   * (modo claro), mas fixa: `next/og` (favicon, imagem de
   * compartilhamento) não lê variável CSS nem sabe resolver OKLCH. */
  primaryHex: string;
  /** `d` de cada `<path>` do ícone, viewBox 24x24 (mesmo formato do
   * lucide-react) — usado tanto no ícone renderizado normalmente
   * (`components/brand-icon.tsx`) quanto nas imagens geradas
   * (`app/icon.tsx`, `app/apple-icon.tsx`, `app/opengraph-image.tsx`),
   * que não conseguem renderizar um componente React qualquer, só um
   * subconjunto de SVG/HTML puro (ver comentário em `app/icon.tsx`).
   */
  iconPaths: string[];
  /** Link do aviso de privacidade mostrado na tela de login — só os
   * verticais com o módulo de privacidade/LGPD (`app/(auth)/privacidade`)
   * têm isso; deixe `undefined` num vertical sem essa tela (o link some
   * sozinho, ver `app/(auth)/login/page.tsx`). */
  privacyPolicyHref?: string;
}

export const BRAND: BrandConfig = {
  name: "Prisma",
  tagline: "Gestão completa para o seu negócio.",
  primaryHex: "#195cc7",
  // lucide-react "gem"
  iconPaths: [
    "M10.5 3 8 9l4 13 4-13-2.5-6",
    "M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z",
    "M2 9h20",
  ],
  privacyPolicyHref: "/privacidade",
};
