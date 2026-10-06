import { ModuleGuard } from "@/components/module-guard";

/** Aviso amigável para quem não tem este módulo liberado. A proteção de
 * verdade é `requireModule("catalogo-bordado")` nas actions/queries do módulo. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ModuleGuard slug="catalogo-bordado">{children}</ModuleGuard>;
}
