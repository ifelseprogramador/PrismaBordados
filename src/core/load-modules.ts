/**
 * Único arquivo que conhece a lista de módulos instalados — importa cada
 * `modules/<modulo>/module.ts` pelo efeito colateral de chamar
 * `registerModule(...)` (ver `core/registry.ts`).
 *
 * Adicionar um módulo novo = criar a pasta + adicionar uma linha aqui.
 * Remover um módulo = apagar a pasta + tirar a linha daqui.
 *
 * Importado uma vez em `app/(app)/layout.tsx`, antes de qualquer leitura
 * de `getEnabledModules()`.
 *
 * Prisma (vertical bordados, nascido do BaseERP) registra aqui os
 * módulos de negócio criados em `src/modules/`. Também é o lugar
 * apropriado para registrar o preset de módulos por `businessType` (ver
 * `core/business-type-presets.ts`) — mesma ideia: um único ponto de
 * bootstrap que conhece a lista de módulos deste vertical.
 */

import "@/modules/clientes/module";
import "@/modules/catalogo-bordado/module";
import "@/modules/pedidos/module";
import "@/modules/financeiro/module";
import "@/modules/fiscal/module";
import { registerBusinessTypePreset } from "@/core/business-type-presets";

registerBusinessTypePreset({
  value: "bordados",
  label: "Bordados",
  defaultModuleSlugs: ["clientes", "catalogo-bordado", "pedidos", "financeiro", "fiscal"],
});
