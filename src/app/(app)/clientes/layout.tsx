import { ModuleGuard } from "@/components/module-guard";

/** Aviso amigável para quem não tem este módulo liberado. A proteção de
 * verdade é `requireModule("clientes")` nas actions/queries do módulo. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ModuleGuard slug="clientes">{children}</ModuleGuard>;
}
