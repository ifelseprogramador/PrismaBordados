import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StaleServiceWorkerCleanup } from "@/components/stale-service-worker-cleanup";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "Prisma";
// Mesmo slogan genérico da tela de login (`(auth)/login/page.tsx`) — de
// propósito sem mencionar "bordado": o nome do sistema não deve amarrar
// a apresentação a um vertical de negócio específico (pedido do
// usuário), e essa descrição é o que aparece ao compartilhar um link
// (WhatsApp, Slack, etc. — via `openGraph`/`twitter` abaixo e
// `opengraph-image.tsx`).
const DESCRIPTION = "Gestão completa para o seu negócio.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <StaleServiceWorkerCleanup />
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors position="top-right" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
