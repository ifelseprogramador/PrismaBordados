# Decisões técnicas (por quê)

Log curto, cronológico, estilo ADR. Cada entrada explica uma decisão e o
porquê — o "como" fica no código e em docs/arquitetura.md.

## 2026-09-24 — Stack idêntica ao mecano-erp

BaseERP nasce como o "core" extraído do mecano-erp (ERP de oficina
mecânica do mesmo autor, em produção). A stack é copiada 1:1 — Next.js 16
(App Router), TypeScript strict, Tailwind v4, shadcn/ui sobre Base UI,
Drizzle + Postgres/Supabase, Vitest + Testing Library + Playwright,
ESLint 9 flat config bloqueando `console.*`, Husky + lint-staged — porque
é uma combinação já validada em produção, não uma escolha nova a testar.
Nenhuma peça específica de oficina mecânica (veículos, ordens de serviço
com campos automotivos) foi portada — só a infraestrutura genérica que
qualquer ERP precisa antes de especializar por ramo.

## 2026-09-24 — RLS ativa desde o início (DIVERGE do mecano-erp)

No mecano-erp, a conexão do app usa o papel `postgres` do Supabase, que
tem `bypassrls = true` — RLS ali é só defesa em profundidade; a proteção
real é o filtro manual `organizationId` aplicado por `withOrg()` em toda
query. Aqui a decisão é oposta: **a RLS é a proteção ativa desde o
primeiro commit**, não uma camada "depois eu ligo".

Por quê: este é um template que vai gerar múltiplos verticais de
produção. Cada vertical, ao adicionar um módulo novo, corre o risco de
esquecer um filtro `where(eq(tabela.organizationId, ...))` em alguma
query — um bug clássico de multi-tenant que vaza dado de uma organização
para outra. Com RLS ativa, esse esquecimento vira "a query volta vazia",
nunca "a query volta com dado de outra organização".

Implementação (ver `src/db/migrations-custom/`, `src/core/db.ts`,
`src/core/auth.ts`, `src/core/admin-auth.ts`):

- `src/db/migrations-custom/0000_app_role.sql` cria o papel Postgres
  `base_erp_app` — **sem** `bypassrls`, **sem** ser dono de nenhuma
  tabela. A APLICAÇÃO em runtime (`DATABASE_URL`) deve conectar como esse
  papel. As migrations (`db:migrate`/`db:generate`, via
  `DATABASE_MIGRATION_URL`) rodam com o papel privilegiado que é dono
  das tabelas (ex.: `postgres`, o papel padrão de um projeto Supabase).
- Dono de tabela e superusuário sempre ignoram RLS no Postgres, com ou
  sem `bypassrls`, a não ser que a tabela use `FORCE ROW LEVEL SECURITY`
  — e forçar RLS no dono quebraria as funções `SECURITY DEFINER`
  (`current_org_ids()`, `is_current_user_platform_admin()`) que
  precisam rodar com o privilégio do dono para evitar recursão infinita
  ao consultar `memberships`/`platform_admins` por dentro. Por isso a
  separação em dois papéis (app vs. migração), e não `FORCE ROW LEVEL
SECURITY`.
- Como uma conexão Postgres direta (via `postgres-js`, sem passar pelo
  PostgREST do Supabase) nunca populariza `auth.uid()` de verdade, as
  funções SQL usam uma variável de sessão própria, `app.current_user_id`,
  definida via `set_config('app.current_user_id', $userId, true)` — o
  terceiro argumento `true` (`is_local`) faz o valor sumir sozinho ao
  fim da transação, nunca vazando para a próxima query que reusar a
  mesma conexão física do pool. Ver `core/db.ts#runWithUserContext`.
- `withOrg()` (app) e `requireAdmin()` (`/admin`) não retornam mais um
  `db` cru — retornam `withDb(fn)`, que roda `fn` dentro dessa
  transação com o contexto já definido. Nenhum módulo deve importar
  `core/db.ts#db` direto (ele existe só para `select 1` do health check
  e como base do `db.transaction` usado por `runWithUserContext`).
- O admin (`/admin`) continua enxergando TODAS as organizações — não
  porque a conexão ignora RLS (como no mecano-erp), mas porque as
  policies fazem `... or public.is_current_user_platform_admin()`. A
  proteção real de `/admin` continua sendo `requireAdmin()` rodar antes
  de qualquer query, exatamente como documentado no mecano-erp — só que
  agora reforçada por uma segunda camada (a RLS) em vez de depender só
  dela.
- O cron de backup (`api/cron/backup/route.ts`) não tem sessão de
  usuário nenhuma — usa `core/db.ts#runWithSystemContext`, que define
  `app.is_system = 'true'`, também reconhecido por
  `is_current_user_platform_admin()` como "acesso total". Protegido só
  por `CRON_SECRET` na camada HTTP.
- Teste de integração obrigatório:
  `src/core/__tests__/rls-isolation.integration.test.ts` — cria 2
  organizações e confirma, com um client Postgres direto (não passando
  por `withOrg()`), que a organização A nunca vê linha da organização B.
  Só é significativo rodando com `DATABASE_URL` apontando para o papel
  `base_erp_app` (não o dono) — o teste documenta isso no topo do
  arquivo, e é pulado (nunca falha por omissão) sem `DATABASE_URL`.

## 2026-09-24 — `businessType` como preset não-acoplado

`organizations.businessType` (texto livre, ex.: "bordados") existe só
para a tela de criar organização em `/admin` sugerir um conjunto de
módulos padrão. Nenhum módulo de negócio deve ler este campo — ver o
comentário em `src/db/schema/tenancy.ts` e a regra 10 em
`src/modules/README.md`. Um vertical que precise de comportamento
condicional por ramo deve modelar isso como configuração própria do
módulo, nunca como `if (org.businessType === "x")` espalhado pelo
código — isso acopla o "core" (que deve continuar genérico, reutilizável
por qualquer vertical) a um ramo de negócio específico.

## 2026-09-24 — Módulos vazios nesta fase (Fase 0)

`src/modules/` só tem um `README.md` com o contrato de arquivos — nenhum
módulo de negócio (nem "clientes", que no mecano-erp seria tentador
considerar "genérico o bastante"). A Fase 0 é só a fundação (tenancy,
auth, RLS, admin, backup, notificações, suporte ao vivo); criar o
primeiro módulo de negócio de verdade é trabalho de uma fase seguinte
(ex.: o vertical "Prisma", para uma empresa de bordados).

## 2026-09-24 — Regra de manutenção do BaseERP

Sempre que uma correção ou melhoria for feita numa peça que pertence ao
core/tenancy/RLS/admin **enquanto se trabalha num vertical nascido deste
template**, essa mudança deve ser replicada de volta para o BaseERP. O
template é o ponto de partida de vários projetos — um bug de segurança
encontrado e corrigido num vertical (ex.: uma policy de RLS incompleta)
provavelmente existe em todos os outros nascidos daqui, incluindo o
próprio template.

## 2026-09-24 — `process.env` dinâmico (herdado do mecano-erp)

O Next.js só consegue substituir uma variável `NEXT_PUBLIC_*` pelo valor
real no bundle do navegador quando o código acessa a propriedade
literalmente (`process.env.NEXT_PUBLIC_X`). Um acesso dinâmico por string
(`process.env[name]`, inclusive dentro de `requireEnv(name)`) vira
`undefined` no navegador, silenciosamente, em dev e produção — só quebra
em runtime quando alguém tenta usar o valor. Por isso `core/env.ts`
avisa, em comentário, para nunca usar `requireEnv` com uma variável
`NEXT_PUBLIC_*` consumida no cliente (`core/supabase/client.ts` acessa
`process.env.NEXT_PUBLIC_SUPABASE_URL` direto, não via `requireEnv`).

## 2026-09-24 — `@tanstack/react-table` não é usado (herdado do mecano-erp)

Tabelas usam só os componentes shadcn (`components/ui/table.tsx`) — sem
uma lib de data-grid. As listas deste template (e dos verticais que
nascerem dele) são de porte pequeno/médio (uma organização por vez, não
milhões de linhas), então paginação/ordenação/filtro no servidor (via
querystring, ver `components/search-box.tsx`) resolve sem o peso e a
complexidade de API de uma lib de tabela completa.

## 2026-09-24 — Prisma nasce de uma cópia do BaseERP

Ponto de partida: cópia integral de `/home/eduardo/code/base-erp` no
commit `7eff4b8` ("Scaffold inicial do BaseERP"), a mesma data acima.
Histórico de git próprio (`git init` novo em `/home/eduardo/code/prisma`,
não fork/branch) — a partir daqui os dois projetos evoluem de forma
independente, seguindo o modelo de template/boilerplate descrito no
plano (`~/.claude/plans/quero-criar-um-sistema-glittery-dragon.md`). Se
precisar comparar uma divergência de core/tenancy/RLS/admin entre os
dois projetos no futuro, o commit `7eff4b8` do BaseERP é a referência
"antes de qualquer especialização de bordado".

Ajustes de identidade nesta cópia: `package.json#name` de `"base-erp"`
para `"prisma"`, título/descrição da aplicação, texto do menu/sidebar e
README — o texto que descrevia o BaseERP como "projeto-template sem
módulo de negócio" foi trocado para descrever o Prisma como o sistema
real que ele passa a ser a partir da Fase 2. Nenhuma mudança de
core/tenancy/RLS/admin foi feita na cópia em si (só identidade visual e
metadados) — a regra de manutenção (replicar correção de core de volta
pro BaseERP) só entra em jogo a partir de agora, se algo em `core/` for
tocado enquanto se trabalha aqui.

## 2026-09-24 — `businessType = "bordados"` como primeiro preset (`core/business-type-presets.ts`)

Implementado como um registro module-level (`registerBusinessTypePreset`/
`getBusinessTypePresets`/`getBusinessTypePreset`), mesmo padrão de
`core/registry.ts` (módulos) — nenhum preset fica hardcoded dentro da
Server Action de criar organização; `core/admin/actions.ts#createOrganization`
só consulta o registro pelo valor de `businessType` digitado e, se achar
um preset, semeia `organization_module_settings` (enabled=true) para os
`defaultModuleSlugs` daquele preset. O preset "bordados" é registrado em
`core/load-modules.ts` (mesmo arquivo que registra os módulos deste
vertical), apontando para `clientes`, `catalogo-bordado`, `pedidos`.

Este mecanismo (`business-type-presets.ts`) vive no Prisma, não no
BaseERP, porque o BaseERP não tem nenhum módulo de negócio para presetar
(ver decisão "Módulos vazios nesta fase" no histórico do BaseERP). É
candidato natural a promoção para o BaseERP no dia em que um segundo
vertical precisar do mesmo mecanismo de preset — nesse momento, mover
`core/business-type-presets.ts` (o registro, genérico) para lá e manter
só o `registerBusinessTypePreset({ value: "bordados", ... })` aqui no
Prisma.

## 2026-09-24 — Onde o módulo `clientes` foi criado: Prisma, não BaseERP

O plano deixou em aberto se `clientes` deveria ser promovido para
universal desde já (portado primeiro para
`base-erp/src/modules/clientes/` e depois copiado para o Prisma) ou
criado direto aqui. Decisão: **criado direto em
`prisma/src/modules/clientes/`**, não no BaseERP.

Por quê: o BaseERP ainda não tem nenhum outro vertical além do Prisma
para justificar a promoção agora — copiar `clientes` para lá hoje
significaria manter uma cópia sem nenhum segundo consumidor validando se
o "genérico" está certo (ex.: um vertical de serviços B2B pode precisar
de campos de cliente bem diferentes de PF/PJ + documento/telefone). A
promoção para o BaseERP fica adiada para quando um segundo vertical
precisar de cadastro de cliente — nesse momento, portar
`prisma/src/modules/clientes/` (já testado em produção aqui) para
`base-erp/src/modules/clientes/`, registrando a decisão nos dois
`docs/decisoes.md`. Ponteiro já registrado do lado do BaseERP (ver
`base-erp/docs/decisoes.md`, "Prisma nasce deste commit; regra de
acoplamento ganha uma exceção") — a promoção em si continua pendente.

## 2026-09-24 — `catalogo-bordado`, não `catalogo` genérico

Nome escolhido deliberadamente específico do vertical (ao contrário de
`clientes`) — o módulo modela tipo de produto, modelo padrão,
tamanhos/cores aceitos: vocabulário de bordado, não de peça automotiva
(mecano-erp) nem de item genérico de venda. Um vertical futuro que
precise de catálogo deve copiar o PADRÃO de arquivos
(`schema.ts`/`validation.ts`/`queries.ts`/...), não o módulo em si —
diferente de `clientes`, que é candidato a promoção porque os CAMPOS
já são genéricos, `catalogo-bordado` tem campos que só fazem sentido
para bordado.

## 2026-09-24 — Regra de acoplamento entre módulos: exceção em `schema.ts`

`src/modules/README.md` (regra 8, herdada do BaseERP) diz que um módulo
só importa de `core/*`, `components/ui/*` e do barrel de outro módulo.
Na prática, `modules/pedidos/schema.ts` importa
`@/modules/clientes/schema` e `@/modules/catalogo-bordado/schema`
diretamente (não os barrels) — porque o Drizzle exige o objeto
`pgTable` real para declarar uma foreign key (`references(() => ...)`),
e o barrel de um módulo não deve reexportar sua tabela crua (isso
vazaria a tabela para qualquer um importar e fazer query direta, fora de
`withOrg()`/`withDb`). Mesmo padrão já usado no mecano-erp
(`modules/ordens/schema.ts` importa `modules/clientes/schema` e
`modules/veiculos/schema` direto).

Exceção restrita a `schema.ts` → `schema.ts` (declaração de FK). Todo o
resto — `queries.ts`, `actions.ts`, `components/`, o barrel de outro
módulo consumido por fora — continua seguindo a regra 8 à risca. Nota
adicionada na regra 8 de `src/modules/README.md`; falta replicar essa
mesma nota em `base-erp/src/modules/README.md` (o arquivo é idêntico nos
dois projetos hoje) — ver apontamento em `base-erp/docs/decisoes.md`.

## 2026-09-24 — `adiantamentoCents` é campo agregado, não lançamento individual

`pedidos.adiantamentoCents` guarda o TOTAL já recebido (soma de todos os
recebimentos), atualizado por `registerAdiantamento` (ver
`modules/pedidos/actions.ts`) — não é o mesmo modelo de "um lançamento
por recebimento". Cada recebimento individual (data, forma de pagamento,
valor) é modelagem do futuro módulo `financeiro` (Fase 3 do plano, fora
do escopo desta entrega), que deve ter uma tabela própria
(`financeiro_lancamentos`, categoria `adiantamento`/`saldo recebido`,
vinculada a `pedidos` por `referenceType`/`referenceId` opcionais) e uma
Server Action fina em `app/(app)/pedidos/[id]/actions.ts` (fora dos dois
módulos, já que nenhum pode importar o outro) orquestrando os dois.

`saldoCents` é coluna GERADA de verdade (`total_cents - adiantamento_cents`,
via `generatedAlwaysAs`) — ao contrário de `totalCents` (que depende de
`pedido_itens`, uma tabela filha, e por isso é recalculado pela
aplicação). Nunca fica negativo na exibição
(`domain.ts#calculateSaldo`), mesmo que um adiantamento tenha sido
lançado maior que o total — caso de borda coberto por
`domain.ts#isAdiantamentoAboveTotal` e testado em
`modules/pedidos/__tests__/domain.test.ts`.

## 2026-09-24 — `pedido_itens` sem `organizationId`, RLS via join

Mesmo padrão de `work_order_items` no mecano-erp, adaptado ao contrato de
RLS ativa do BaseERP/Prisma: em vez de um filtro manual
`where(eq(table.organizationId, ...))`, as 4 policies de
`pedido_itens` (ver `src/db/migrations-custom/0005_modulos_bordados_rls.sql`)
usam `exists (select 1 from pedidos where pedidos.id = pedido_itens.pedido_id
and (pedidos.organization_id in (select current_org_ids()) or
is_current_user_platform_admin()))`. Consequência prática: `pedido_itens`
ficou fora do backup por organização (`core/backup.ts` só cobre tabelas
com `organization_id` direto) — registrado como limitação conhecida em
`modules/pedidos/module.ts`, sem plano de correção nesta entrega (o
pedido em si já entra no backup; os itens, não).

## 2026-09-24 — Ambiente sem Postgres real: testes de integração gated por `DATABASE_URL`

Confirmado (herdado do relatório da Fase 0): não há Postgres/Docker
disponível neste ambiente de desenvolvimento. Nenhuma migration foi
rodada contra um banco real, nenhum projeto Supabase foi criado para o
Prisma — `.env.example` permanece como veio do BaseERP (sem projeto
vinculado). A migration do drizzle-kit para as tabelas dos 3 módulos
novos (SEQ `0001_quick_frank_castle.sql`) foi FOI GERADA
(`drizzle-kit generate`, que só lê o schema local) mas nunca aplicada. Os
testes que dependeriam de banco real (queries/actions de
`clientes`/`catalogo-bordado`/`pedidos` com RLS ativa e 2 organizações)
não foram escritos como testes de integração de verdade — a suíte cobre
`domain.ts`/`validation.ts` (100% sem banco) e deixa a verificação de
RLS+queries para quando houver um Postgres real disponível, seguindo o
mesmo padrão gated de `rls-isolation.integration.test.ts` da Fase 0.

## 2026-09-24 — Módulo `financeiro`/`fiscal`: implementados (Fase 3/4)

Atualização da entrada anterior ("fora de escopo desta entrega"): as
Fases 3 (`financeiro` + dashboard) e 4 (`fiscal`, interface
`FiscalProvider`) do plano foram implementadas. As decisões específicas
de cada uma estão detalhadas nas entradas abaixo.

## 2026-09-24 — `financeiro_lancamentos.referenceId` sem foreign key

`financeiro_lancamentos.referenceId` (junto de `referenceType`, que vale
`"pedido"` ou `"manual"`) é uma coluna `uuid` SOLTA, sem
`references(() => pedidos.id)` — ao contrário de `fiscal_notas.pedidoId`,
que usa a exceção `schema.ts` → `schema.ts` documentada na regra 8 do
contrato de módulo.

Os dois lados considerados:

- **A favor de uma FK real** (o mesmo padrão de `fiscal_notas`):
  integridade garantida pelo banco, `onDelete` explícito, join direto sem
  risco de "órfão" apontando para um pedido apagado.
- **A favor de deixar solto** (decisão tomada): `financeiro` é
  candidato explícito a promoção para o BaseERP assim que estabilizar
  (ver docs/decisoes.md do BaseERP e a entrada "Onde o módulo `clientes`
  foi criado" acima, mesmo raciocínio) — o BaseERP não tem `pedidos`
  nem vai ter tão cedo (é um projeto-template sem vertical). Uma FK real
  em `schema.ts` amarraria `financeiro` a conhecer o pacote
  `@/modules/pedidos/schema` para sempre, inviabilizando copiar o módulo
  para o BaseERP sem também levar (ou remover) essa dependência. Além
  disso, um lançamento financeiro é uma entidade que faz sentido sozinha
  (um lançamento manual nunca teve `referenceId` desde o início) — ao
  contrário de `fiscal_notas`, que é conceitualmente sempre filha de um
  pedido.

Decisão: manter sem FK. A integridade fica com a camada de orquestração
(`app/(app)/pedidos/[id]/financeiro-actions.ts`, que só grava
`referenceId` com um `pedidoId` que acabou de confirmar existir) — nunca
o banco. Se `pedidos` apagar um pedido no futuro (hoje `onDelete:
"restrict"` impede isso), o lançamento financeiro correspondente vira um
registro histórico "órfão" — aceitável, porque um lançamento financeiro
é prova de caixa (dinheiro que entrou/saiu de verdade) e não deveria
desaparecer só porque o pedido que o originou foi removido.

## 2026-09-24 — Orquestração pedidos↔financeiro: onde ficou

`registerAdiantamento` (em `modules/pedidos/actions.ts`) continua
gravando só o TOTAL agregado recebido por um pedido — nunca cria um
lançamento financeiro sozinho (nem poderia, `pedidos` não importa
`financeiro`). A Server Action fina
`app/(app)/pedidos/[id]/financeiro-actions.ts#registrarRecebimentoPedido`
é o único lugar que conhece os dois barrels ao mesmo tempo: lê o pedido
ANTES (`getPedidoById`), chama `registerAdiantamento` (grava o novo
agregado), lê o pedido DEPOIS, calcula a DIFERENÇA entre os dois
agregados (o valor recebido NESTA vez, não o total acumulado) e, se
positiva, cria um lançamento de `entrada` via
`financeiro#createLancamentoRecord` — categoria `saldo_recebido` quando
esse recebimento zera o saldo do pedido, `adiantamento` caso contrário.

`modules/pedidos/components/adiantamento-form.tsx` ganhou uma prop
`action` opcional (um `BoundAction`) para a página injetar essa
orquestração sem o componente do módulo `pedidos` importar `financeiro`
diretamente — sem a prop, cai de volta no `registerAdiantamento` puro do
próprio módulo (só grava o agregado, sem lançamento automático). Testado
sem banco em
`app/(app)/pedidos/[id]/__tests__/financeiro-actions.test.ts`, mockando
os dois barrels (`@/modules/pedidos` e `@/modules/financeiro`).

## 2026-09-24 — Recharts confinado a `modules/financeiro/components`

O usuário pediu estatísticas "fáceis de entender" para substituir a
planilha — motivo que já estava registrado no plano para divergir do
mecano-erp (que não usa lib de gráfico nenhuma, só CSS). `recharts` foi
adicionado a `package.json#dependencies`, mas só é importado dentro de
`modules/financeiro/components/entradas-saidas-chart.tsx` — nenhum
arquivo de `core/` ou de outro módulo importa `recharts` diretamente;
o dashboard (`app/(app)/page.tsx`) só importa o COMPONENTE já pronto
pelo barrel de `financeiro`, nunca a lib em si. Se um dia `financeiro`
for promovido para o BaseERP, a dependência de gráfico vai junto — o
BaseERP continua sem Recharts enquanto isso não acontecer.

A skill de dataviz foi consultada antes de escrever o componente (ver
comentário no topo de `entradas-saidas-chart.tsx`): paleta
verde/vermelho validada com
`scripts/validate_palette.js "#008300,#e34948" --mode light --pairs all`
(WARN de separação CVD na faixa 6–8, mitigado por legenda + tooltip
sempre visíveis, nunca só a cor), barras AGRUPADAS (não empilhadas,
porque entrada e saída não somam um total com sentido), um eixo só,
cores via CSS custom properties escopadas ao componente (convenção
`.dark` já usada em `app/globals.css`, não uma dependência de tema
nova).

## 2026-09-24 — Lucro vs. "saldo a receber": métricas separadas, nunca somadas

`financeiro/domain.ts#calculateLucro` (entradas − saídas de um período,
pode ser negativo) e `pedidos/queries.ts#getPedidosDashboardSummary`
(`receivableCents`, soma de `saldoCents` de pedidos NÃO terminais) são
métricas conceitualmente diferentes — uma é caixa (dinheiro que já
entrou/saiu), a outra é pipeline (dinheiro que ainda vai entrar). A
planilha antiga da empresa aparentemente misturava as duas num único
número. O dashboard (`app/(app)/page.tsx`) mostra os dois KPIs lado a
lado, nunca soma um no outro. `pedidos/domain.ts#isReceivableStatus`
(nova função pura, testada em `__tests__/domain.test.ts`) documenta a
regra "pedido `cancelado` (e `entregue`) nunca conta como a receber" de
forma testável sem banco — a query real em `queries.ts` já aplicava essa
regra em SQL (`status not in ('entregue', 'cancelado')`) desde a Fase 2;
o helper é a versão testável da mesma regra, não uma reescrita da query.

## 2026-09-24 — Campo que decide NF-e vs. NFS-e por item: `catalogoItemId`, sem coluna nova

Em vez de adicionar uma coluna nova em `pedido_itens` (o que faria
`fiscal` precisar conhecer mais do schema de `pedidos`, ou `pedidos`
precisar conhecer conceitos fiscais), `modules/fiscal/domain.ts#decideOperacaoTipo`
reaproveita um sinal que `pedido_itens` já tinha desde a Fase 2:
`catalogoItemId`. Um item vinculado a um item de catálogo é uma peça
PRONTA que a empresa vende (operação de venda → NF-e); um item sem
vínculo (produto digitado à mão — o cliente trouxe a peça própria para
bordar) é serviço sobre bem de terceiro (→ NFS-e). Isso já é exatamente
a semântica documentada em `modules/pedidos/schema.ts#pedidoItens`
("o cliente pode trazer peça própria, sem nenhum item de catálogo por
trás") — nenhuma migration nova foi necessária no schema de `pedidos`.
Um pedido com itens dos dois tipos gera NF-e E NFS-e separadas (mesmo
`pedidoId`, duas linhas em `fiscal_notas`).

## 2026-09-24 — Provider "não configurado": formato fail-safe

`fiscal_credentials.providerSlug` fica vazio/null até a organização
escolher um provedor real (nenhum foi implementado nesta fase — decisão
adiada pelo usuário). `modules/fiscal/resolve-provider.ts#resolveFiscalProvider`
resolve isso em runtime: qualquer slug vazio ou desconhecido cai num
`NaoConfiguradoFiscalProvider` que NUNCA lança — `emitirNFe`/`emitirNFSe`/
`consultar` devolvem `{ status: "erro", errorMessage: <mensagem
amigável> }`, `cancelar` devolve `{ ok: false, errorMessage }`, e só
`baixarPdf`/`baixarXml` lançam (não há nada plausível para devolver como
"arquivo" de uma nota que nunca foi emitida — quem chama já checa
`status === "emitida"` antes de oferecer o link). Isso garante que
"emitir nota" a partir de um pedido nunca quebra o fluxo do pedido
mesmo sem provedor nenhum contratado: grava `fiscal_notas.status =
'erro'` com a mensagem, e a UI mostra isso como qualquer outro erro de
nota. O núcleo de emissão (`run-emissao.ts#runEmissaoParaPedido`) captura
também qualquer exceção lançada por uma implementação real futura
(`try/catch` em volta de `provider.emitirNFe`/`emitirNFSe`), pelo mesmo
motivo.

## 2026-09-24 — `fiscal_notas` com FK real; `fiscal_credentials` fora do backup

`fiscal_notas.pedidoId` usa a exceção `schema.ts` → `schema.ts` (importa
`@/modules/pedidos/schema` direto, mesmo padrão já usado por
`modules/pedidos/schema.ts` em relação a `clientes`/`catalogo-bordado`) —
decisão consistente com a regra já registrada acima
("`financeiro_lancamentos.referenceId` sem FK"): aqui a entidade É
conceitualmente filha de um pedido específico (nunca existe sozinha),
então a FK real faz sentido e não compromete uma promoção futura (`fiscal`
também é candidato a promoção pro BaseERP, mas só no dia em que o
BaseERP tiver um conceito de "pedido"/"ordem" — até lá, `fiscal` fica no
Prisma mesmo).

`fiscal_credentials` (guarda `apiKeyEncrypted`, mesmo que placeholder)
NUNCA entra no backup por organização (`core/backup.ts`) — só
`fiscal_notas` chama `registerBackupTable`. Um arquivo de backup
exportável não é o lugar certo para um segredo, mesmo fracamente
"criptografado" (ver decisão seguinte).

## 2026-09-24 — `apiKeyEncrypted`: placeholder, não é solução de produção

`modules/fiscal/crypto-placeholder.ts` implementa uma codificação
reversível (base64 + prefixo de versão) só para não gravar a chave de
API em texto puro durante o MVP local — documentado explicitamente no
próprio arquivo como INSUFICIENTE para produção (qualquer um com acesso
de leitura ao banco decodifica trivialmente). Antes de qualquer
organização real usar o módulo fiscal, trocar por uma solução de secrets
de verdade (Supabase Vault, KMS de nuvem, ou um cofre externo). Tanto
`apiKeyEncrypted` quanto `providerConfig` (que pode carregar segredos
específicos de um provedor futuro) foram adicionados ao padrão de
`redact()` do logger (`core/logger.ts#SENSITIVE_KEY_PATTERN`) — nunca
aparecem em log, mesmo em erro.

## 2026-09-24 — `run-emissao.ts`: núcleo puro de emissão/cancelamento, testável com provider fake

`modules/fiscal/actions.ts#emitirNotaFiscal`/`cancelarNotaFiscal` fazem
só I/O de banco (ler credenciais, gravar `fiscal_notas`) em cima de duas
funções puras extraídas para `run-emissao.ts`
(`runEmissaoParaPedido`/`runCancelamento`), que recebem um
`FiscalProvider` já resolvido e nunca tocam banco — só chamam o
provider. Isso permite testar o fluxo inteiro (separação NF-e/NFS-e,
emissão múltipla, erro do provider capturado sem lançar, cancelamento
com/sem `providerNotaId`) com `__tests__/provider.fake.ts`
(`FakeFiscalProvider`, que não faz rede nenhuma) em vez de precisar de
Postgres — mesma disciplina de `pedidos/domain.ts`, aplicada a uma peça
que envolve um "port" externo (o provider) em vez de só cálculo.

## 2026-09-24 — RLS validada contra Postgres real (BaseERP + módulos de bordado)

Mesma validação descrita em `base-erp/docs/decisoes.md` (bug de ordenação
entre `0001_rls_policies.sql`/`0002_platform_admin_rls.sql` corrigido e
espelhado aqui, teste de isolamento com premissa quebrada corrigido e
espelhado aqui). Adicionalmente, rodado neste projeto: as migrations
completas (drizzle-kit + custom, incluindo `0005_modulos_bordados_rls.sql`
e `0006_financeiro_fiscal_rls.sql`) foram aplicadas do zero contra um
Postgres 16 local sem erros, e um smoke test manual (SQL direto, dois
usuários comuns em duas organizações diferentes) confirmou isolamento real
em `clientes`, `pedidos` e `pedido_itens` — este último o caso mais
arriscado, por ter RLS via `exists (select ... from pedidos where ...)`
em vez do padrão simples `organization_id in (...)`: usuário da
organização A não via o pedido nem o item da organização B.

Não foi possível validar da mesma forma `financeiro_lancamentos` e
`fiscal_notas`/`fiscal_credentials` neste smoke test (ficou restrito ao
que já existia batendo com os módulos testados na Fase 2) — recomendação
para quem for validar antes de produção: repetir o mesmo smoke test
manual cobrindo esses dois módulos, com atenção especial a
`financeiro_lancamentos.reference_id` (sem FK, decisão deliberada) e a
`fiscal_notas` (FK real para `pedidos`, 1:N).
