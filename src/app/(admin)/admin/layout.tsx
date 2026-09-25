import "@/core/load-modules";
import Link from "next/link";
import { ArrowLeftRight, LogOut, Megaphone, ShieldAlert } from "lucide-react";
import { requireAdmin, NotPlatformAdminError } from "@/core/admin-auth";
import { Button } from "@/components/ui/button";
import { VersionBadge } from "@/components/version-badge";
import { logout } from "@/app/(auth)/actions";
import { listPendingUserRequestsForAdmin } from "@/core/live-support/queries";
import { SupportNotificationBell } from "@/core/admin/components/support-notification-bell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof NotPlatformAdminError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-lg font-semibold">Área restrita</h1>
          <p className="text-muted-foreground max-w-sm text-sm">{err.message}</p>
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/" />} nativeButton={false}>
              Voltar ao painel
            </Button>
            <form action={logout}>
              <Button variant="ghost" type="submit">
                Sair
              </Button>
            </form>
          </div>
        </div>
      );
    }
    throw err;
  }

  const pendingRequests = await listPendingUserRequestsForAdmin();

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 border-b bg-zinc-950 px-3 py-3 text-zinc-50 sm:px-4">
        <Link href="/admin" className="flex min-w-0 items-center gap-2 hover:text-zinc-300">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          {/* Título curto no celular (senão estoura a linha junto dos
              botões à direita) — nome completo a partir de `sm`. */}
          <span className="truncate font-semibold">
            <span className="sm:hidden">Prisma Admin</span>
            <span className="hidden sm:inline">Prisma — Administração da plataforma</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <VersionBadge className="hidden text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 sm:inline-flex" />
          {/* Botões (não links soltos de texto) pra ficar claro que são
              ações/destinos — "Notificações" com borda por ser a área do
              dono; "Voltar ao app" mais discreto, só no hover. Megafone e
              não sino: o sino ao lado já é o de pedidos de suporte.
              Rótulo de texto só a partir de `sm` — no celular vira ícone
              puro (senão os itens deste grupo não cabem na largura da
              tela, o bug original reportado: "área do dono estourando a
              tela no celular"). */}
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/admin/notificacoes" aria-label="Notificações" />}
            className="border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-50"
          >
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Notificações</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/" aria-label="Voltar ao app" />}
            className="text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar ao app</span>
          </Button>
          <SupportNotificationBell initialRequests={pendingRequests} />
          <form action={logout}>
            <Button
              variant="ghost"
              size="icon"
              type="submit"
              aria-label="Sair"
              className="text-zinc-50"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 bg-zinc-50 p-4 md:p-6 dark:bg-zinc-900">{children}</main>
    </div>
  );
}
