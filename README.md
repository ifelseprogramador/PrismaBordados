# Prisma

ERP para empresas de bordados eletrônicos. Nasceu como cópia do
projeto-template [BaseERP](/home/eduardo/code/base-erp) (fundação
multi-tenant: autenticação, tenancy, RLS, painel do dono da plataforma,
backup, notificações, suporte ao vivo) e evoluiu com os módulos de negócio
do vertical bordados:

- **`clientes`** — cadastro de clientes (PF/PJ), documento, telefone,
  endereço.
- **`catalogo-bordado`** — itens de catálogo (tipo de produto, modelo
  padrão, tamanhos/cores aceitos, preço padrão sugerido).
- **`pedidos`** — o módulo central: pedidos de bordado com itens, máquina
  de estados (`orcamento → aprovado → em_producao → pronto → entregue`,
  com `cancelado` a partir de qualquer estado não-terminal), impressão do
  pedido reproduzindo o formulário físico usado pela empresa.
- **`financeiro`** — lançamentos de entrada/saída, lucro do período
  (entradas − saídas, diferente de "saldo a receber" de `pedidos`),
  dashboard com gráfico de entradas x saídas (Recharts, confinado a este
  módulo — ver `docs/decisoes.md`). Um recebimento registrado num pedido
  gera um lançamento de entrada automático, orquestrado fora dos dois
  módulos (`app/(app)/pedidos/[id]/financeiro-actions.ts`).
- **`fiscal`** — interface `FiscalProvider` (emissão de NF-e/NFS-e,
  consulta, cancelamento, download de PDF/XML) desacoplada de qualquer
  provedor real — nenhum provedor concreto foi escolhido/implementado
  ainda (decisão adiada pelo usuário). Decide NF-e (peça pronta vendida)
  vs. NFS-e (serviço sobre peça do cliente) por item do pedido a partir
  de `catalogoItemId`. Um `FakeFiscalProvider` exercita o fluxo
  ponta a ponta em teste.

Ver `docs/arquitetura.md` e `docs/decisoes.md` para a documentação viva
(arquitetura, decisões técnicas).

## Stack

- Next.js 16 (App Router), TypeScript strict, Tailwind CSS v4
- shadcn/ui sobre [Base UI](https://base-ui.com) (não Radix — ver
  `components.json`)
- Supabase (Auth + Postgres) via `@supabase/ssr` e `drizzle-orm`
- React Hook Form + Zod
- Vitest + Testing Library + Playwright
- ESLint 9 (flat config) + Prettier + Husky/lint-staged

## Setup

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha com os dados do seu
   próprio projeto Supabase (nenhum projeto real está vinculado ainda —
   crie um em https://supabase.com/dashboard quando for hospedar).
3. Rode as migrations: `npm run db:migrate` — aplica as migrations do
   drizzle-kit e, em seguida, as migrations custom (`src/db/migrations-custom/`),
   que criam o papel `base_erp_app` (RLS ativa — ver docs/decisoes.md),
   as funções de RLS e as policies. Use `DATABASE_MIGRATION_URL`
   (conexão privilegiada, dona das tabelas) para isso — ver
   `.env.example`.
4. Rode o seed: `npm run db:seed` — cria a primeira organização, o
   primeiro usuário e registra o dono da plataforma.
5. `npm run dev`

## Configurando o banco (RLS ativa)

Diferente do projeto de referência (mecano-erp), aqui a RLS é a proteção
ativa desde o início, não só defesa em profundidade — ver
docs/decisoes.md, "RLS ativa desde o início". Isso exige DOIS papéis de
conexão Postgres:

- **Migração** (`DATABASE_MIGRATION_URL`): o papel padrão/dono do
  projeto Supabase (`postgres`), usado só por `npm run db:migrate` /
  `db:generate` / `db:studio`.
- **Aplicação** (`DATABASE_URL`): o papel `base_erp_app`, criado pela
  primeira migration custom (`0000_app_role.sql`) — sem `bypassrls`, sem
  ser dono de nenhuma tabela. É esse papel que a aplicação usa em
  runtime (`core/db.ts`).

Em ambiente local de teste sem essa separação (ex.: um Postgres onde
você só tem um usuário disponível), o app funciona, mas a RLS não fica
de fato isolada — o dono de tabela ignora RLS por padrão no Postgres.
Rode `src/core/__tests__/rls-isolation.integration.test.ts` contra um
Postgres com os dois papéis configurados para confirmar o isolamento de
verdade (o teste documenta os passos no topo do arquivo). Todos os
testes de integração deste projeto (RLS e os de `queries.ts`/`actions.ts`
de módulo) são pulados automaticamente sem `DATABASE_URL` configurado —
nenhum Postgres real está disponível neste ambiente de desenvolvimento
no momento desta entrega.

## Scripts

| Script                                                         | O que faz                                                   |
| -------------------------------------------------------------- | ----------------------------------------------------------- |
| `npm run dev`                                                  | Sobe o servidor de desenvolvimento                          |
| `npm run build` / `start`                                      | Build e start de produção                                   |
| `npm run lint` / `format` / `format:check`                     | ESLint / Prettier                                           |
| `npm run typecheck`                                            | `next typegen && tsc --noEmit` (Next 16 gera tipos de rota) |
| `npm run test` / `test:watch` / `test:coverage`                | Vitest                                                      |
| `npm run test:e2e`                                             | Playwright (`e2e/`)                                         |
| `npm run db:generate` / `db:migrate` / `db:seed` / `db:studio` | Drizzle                                                     |
| `npm run check`                                                | format:check + lint + typecheck + test — rodado no CI       |

## Deploy

Preparado para a Vercel (região `gru1`, ver `vercel.json`), com
`api/health` para monitoramento e `api/cron/backup` (protegido por
`CRON_SECRET`) agendado via `vercel.json`. Nenhum deploy real foi feito
ainda — configure o projeto Vercel + Supabase quando for hospedar de
verdade.

## Relação com o BaseERP

Este projeto nasceu de uma cópia integral do BaseERP
(`/home/eduardo/code/base-erp`, commit `7eff4b8`) — histórico de git
próprio, não fork/branch. **Regra de manutenção**: qualquer correção
feita numa peça herdada do BaseERP (core/tenancy/RLS/admin) enquanto se
trabalha aqui deve ser replicada de volta para o template, e
vice-versa — ver `docs/decisoes.md`.

## Módulos de negócio

Cada módulo em `src/modules/<modulo>/` segue o contrato de arquivos
documentado em `src/modules/README.md` (herdado do BaseERP):
`module.ts`, `schema.ts`, `schema.types.ts`, `validation.ts`,
`queries.ts`, `actions.ts`, `index.ts` (barrel), `components/`,
`__tests__/`.
