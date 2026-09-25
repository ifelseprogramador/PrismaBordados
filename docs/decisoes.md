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

## 2026-09-24 (cont.) — Validado de ponta a ponta contra o projeto Supabase real

Migrations aplicadas com sucesso contra o projeto Supabase real deste
sistema (`PrismaBordados`): tenancy, RLS, papel `base_erp_app`, e os
módulos de bordado/financeiro/fiscal. Senha do papel de aplicação
definida, `DATABASE_URL` migrado para o pooler.

Corrigidos dois problemas que só apareceram contra Supabase de verdade
(mesmos do BaseERP, ver `base-erp/docs/decisoes.md` para o detalhe):
`auth.users` real recusa insert direto (o teste de isolamento foi
reescrito para usar a Admin API do Supabase, criando/apagando usuários
reais), e o formato do username no pooler precisa do project ref como
sufixo (`base_erp_app.<ref>`, não só `base_erp_app`).

Isolamento validado dessas duas formas: (1) o teste de integração
reescrito, rodando com usuários reais via Admin API; (2) um script
descartável adicional (criado, rodado e apagado na mesma sessão) que
criou 2 organizações e 2 usuários reais e confirmou que um não vê dados
do outro, e que sem contexto de sessão nenhuma organização é visível.

## 2026-09-25 — Testado no navegador de verdade: 4 bugs reais corrigidos

Rodei o app de verdade (`npm run dev` + Playwright dirigindo um Chromium
real, não só os testes automatizados) e o próprio usuário testou em
paralelo. Isso achou problemas que nenhum teste unitário/integração pega:

1. **`clientes`/`catalogo-bordado` sem ficha de detalhe** — as Server
   Actions `updateCliente`/`deleteCliente` (e equivalentes de catálogo)
   já existiam prontas desde a Fase 2, mas não havia nenhuma rota
   `/clientes/[id]` nem link nenhum saindo da lista — criar um cliente
   funcionava, mas não tinha como editar ou remover depois. Corrigido:
   `ClienteForm`/`CatalogoItemForm` generalizados para criar E editar
   (mesmo padrão `action` injetável do `CustomerForm` do mecano-erp,
   com `key={registro?.updatedAt}`), páginas `[id]/page.tsx` novas com
   `ConfirmDeleteButton`, e `createCliente`/`createCatalogoBordadoItem`
   passaram a retornar o `id` criado para o form navegar direto pra
   ficha (em vez de ficar preso em `/novo` sem feedback nenhum).
2. **Item de catálogo não pré-preenchia nada** — selecionar um item no
   dropdown "Item de catálogo (opcional)" do form de item de pedido não
   fazia nada além de guardar a referência; produto/modelo/valor
   unitário continuavam em branco, obrigando a redigitar tudo — o oposto
   do que a Fase 2 documentou como intenção. Corrigido com um
   `onChange` que preenche os campos via `ref` (o cliente ainda pode
   editar antes de adicionar).
3. **Bug de ambiente, não de código**: um service worker registrado pelo
   mecano-erp (que roda na mesma porta 3000 em outro momento) ficava
   associado à origem `http://localhost:3000` e servia uma versão em
   cache do mecano (cor/tema laranja) antes do F5 corrigir. Como este
   projeto ainda não tem service worker próprio, adicionado
   `StaleServiceWorkerCleanup` (client component no `layout.tsx` raiz)
   que desregistra qualquer service worker e limpa o cache ao montar —
   remover quando o Fase 5 (PWA/offline) implementar o service worker de
   verdade deste projeto.
4. **Filtro/ordenação existiam só no backend** — `listPedidos` já aceitava
   `status`/`sort` desde a Fase 2, mas não havia nenhum controle de UI
   pra usar isso, e `clientes`/`catalogo-bordado` não tinham filtro
   nenhum. Portado `ListFilterBar` do mecano-erp (componente 100%
   genérico, foi para `components/` do BaseERP também) e adicionado
   `CLIENTE_SORT_OPTIONS`/`CATALOGO_BORDADO_SORT_OPTIONS` seguindo a
   convenção `<MODULO>_SORT_OPTIONS` do mecano. Também criado
   `PEDIDOS_ABERTOS_STATUSES` + suporte a `statusIn` em `listPedidos`
   para o filtro "Em aberto" (que soma vários status, não é um valor
   único do enum).

## 2026-09-25 (cont.) — Links de linha viram `ActionLink`, cards do painel ficam clicáveis

Portado `ActionLink` do mecano-erp (`components/action-link.tsx` —
mesmo componente, cor primária sem sublinhado fixo, ícone que desliza
no hover/foco) para todo link de linha de tabela (`clientes`,
`catalogo-bordado`, `pedidos`, lista de "pedidos recentes" do painel) —
foi para `components/` do BaseERP também, como o `ListFilterBar`.
Correção de rumo: uma tentativa anterior (sublinhado com transição CSS
própria) foi revertida a pedido do usuário, que queria exatamente o
padrão visual do mecano-erp, não uma variação nova.

Cada card de KPI do painel (`Pedidos em aberto`, `Aguardando aprovação`,
`Em produção`, `Saldo a receber`, etc.) agora é um link para
`/pedidos?status=<valor>` (ou `/clientes`, `/financeiro`) — antes o
número era só uma estatística solta, sem jeito de ver quais pedidos
exatamente a compõem.

## 2026-09-25 (cont.) — Checklist de LGPD + direitos do titular no módulo `clientes`

Criado `docs/lgpd-checklist.md`: status item a item da LGPD (direitos do
titular, base legal, registro de operações, segurança, aviso de
privacidade, DPO, retenção, incidente, sub-processadores), separando o
que é código (implementado nesta entrada) do que é decisão de
negócio/jurídica que nenhum agente resolve sozinho (razão social/CNPJ
real, nome do encarregado, prazo de retenção definitivo, texto legal
revisado por advogado).

Implementado:

- **Eliminação (Art. 18, VI)**: `anonymizeCliente` (`modules/clientes/actions.ts`)
  sobrescreve nome/documento/telefone/endereço/e-mail e marca
  `clientes.anonymizedAt` (coluna nova) — a linha continua existindo só
  para não quebrar a FK `pedidos.customerId` (`onDelete: "restrict"`).
  `deleteCliente` (DELETE de verdade) continua existindo para o caso sem
  histórico nenhum. A escolha entre os dois é feita ANTES de chamar
  `clientes` — `app/(app)/clientes/[id]/privacy-actions.ts#solicitarExclusaoCliente`
  consulta `pedidos` (`listPedidosByClienteId`, novo) e decide, porque
  `clientes` não pode importar `pedidos` (regra 8, `src/modules/README.md`).
  Mesmo padrão de orquestração fina fora dos dois módulos já usado em
  `financeiro-actions.ts` (ver decisão "Orquestração pedidos↔financeiro").
  `updateCliente` passou a recusar editar um cliente já anonimizado
  (`isNull(clientes.anonymizedAt)` no `where`) — defesa server-side além
  de a UI esconder o formulário.
- **Portabilidade (Art. 18, V)**: `exportarDadosCliente` (mesmo arquivo
  de orquestração) devolve cadastro + resumo dos pedidos como JSON; a UI
  (`modules/clientes/components/cliente-privacy-actions.tsx`) baixa isso
  como arquivo.
- **Registro de operações (Art. 37)**: tabela nova `lgpd_request_log`
  (`db/schema/privacy.ts`) + `recordLgpdAction` (`core/audit-log.ts`),
  gravado dentro da MESMA transação da operação (nunca um sem o outro).
  RLS própria em `migrations-custom/0007_lgpd_rls.sql` — deliberadamente
  SEM policy de UPDATE/DELETE (diferente do `apply_org_rls` padrão do
  resto do projeto): um log de conformidade que a própria organização
  auditada pudesse apagar não provaria nada. Diferente de `audit_log`
  (`db/schema/live-support.ts`), que é só do admin da plataforma —
  `lgpd_request_log` é visível pela PRÓPRIA organização (ela precisa
  poder demonstrar conformidade se for auditada).
- **Aviso de privacidade**: página nova `/privacidade`
  (`app/privacidade/page.tsx`), adicionada a `PUBLIC_PATHS` em
  `core/supabase/middleware.ts` (só tinha `/login` antes) — precisa ser
  legível sem login. Conteúdo é um ESQUELETO com seções marcadas
  `[PREENCHER]` onde a decisão é da empresa (razão social, prazos,
  nome do encarregado), não texto jurídico pronto para publicar.
  Linkada no rodapé de `(auth)/login/page.tsx`.

Migration do drizzle-kit gerada (`0003_nappy_captain_midlands.sql`,
tabela `lgpd_request_log` + coluna `clientes.anonymized_at`) mas **não
aplicada** — mesma situação já registrada acima ("Onde as migrations do
Drizzle-kit para os 3 módulos... FOI GERADA... mas nunca aplicada"),
só que agora `.env.local` TEM credenciais reais de Supabase configuradas
(ver "Validado de ponta a ponta"), então aplicar exige rodar
`npm run db:migrate` deliberadamente contra esse projeto — não rodado
nesta sessão sem confirmação explícita do usuário, por ser uma alteração
de schema num banco que pode já ter dado real.

Fora do escopo desta entrada (ver "Pendências técnicas" em
`docs/lgpd-checklist.md`): página de configurações de privacidade por
organização (o aviso hoje é estático, não lê dado da organização), cron
de retenção automática (depende do prazo ser decidido primeiro),
criptografia de CPF/CNPJ/endereço em repouso, log de LEITURA (só
escrita é registrada hoje).

Adicionados hints (`<Hint>`, já existente em `core`) em: CPF/CNPJ do
cliente (a validação confere dígito verificador de verdade, não só
formato), adiantamento do pedido (é o TOTAL já recebido, não o valor de
um novo pagamento — ponto que já tinha confundido até a validação
manual desta sessão), item de catálogo no form de pedido (o que o
preenchimento automático faz), preço padrão do catálogo (é só sugestão,
o valor final do pedido continua editável), e nota fiscal (como o
sistema decide NF-e vs. NFS-e por item).

## 2026-09-25 — `registerModule` vira upsert por `slug` (bug de HMR, não de LGPD)

Erro reportado pelo usuário depois da entrega de LGPD: React acusando
"Encountered two children with the same key, `clientes`" no menu lateral
(`sidebar-nav.tsx`). Não era bug na feature de LGPD em si — era um bug
latente em `core/registry.ts#registerModule` (herdado do BaseERP), que
fazia só `MODULES.push(definition)` num array module-level. Os edits
desta sessão em `modules/clientes/*` e `modules/pedidos/*` dispararam um
Fast Refresh do Turbopack que reavaliou `core/load-modules.ts` sem
reiniciar o processo Node — cada `modules/<modulo>/module.ts` roda de
novo, e o `push` puro empilhava o mesmo `slug` de novo a cada
reavaliação, sem limite, pelo tempo de vida do `next dev`. Não afeta
produção (processo novo por deploy).

Corrigido trocando `push` por upsert (`findIndex` por `slug`, substitui
se já existir). É peça de `core/`, replicado para
`base-erp/docs/decisoes.md` (mesma data) pela regra de manutenção.

## 2026-09-25 (cont.) — Configurações de LGPD por organização (`/lgpd`)

Pedido do usuário: o Prisma é multi-tenant (cada organização é uma
empresa de bordado diferente, cliente do sistema) — um único texto fixo
de aviso de privacidade não serve, cada organização precisa do próprio
CNPJ, encarregado e prazo de retenção editáveis.

Criada tabela `organization_privacy_settings` (`db/schema/privacy.ts`,
uma linha por organização, "sem linha" = campos vazios + prazo padrão de
5 anos — mesmo padrão de `organization_backup_settings`) e um pacote
`core/privacy/` (settings.ts, validation.ts, actions.ts, types.ts,
components/) com uma tela nova em `/lgpd`
(`app/(app)/lgpd/page.tsx`), linkada fixa no menu lateral (mesmo padrão
de "Backup" em `sidebar-nav.tsx` — não é módulo `registerModule`
desligável via `/admin`, porque conformidade não deveria ser opcional
por organização).

A tela tem dois blocos: um formulário (razão social, CNPJ — validado
com `core/document.ts#isValidCnpj` —, endereço, nome/contato do
encarregado, prazo de retenção) e um preview do aviso de privacidade já
com esses dados preenchidos, com botão "Copiar texto"
(`privacy-notice-preview.tsx`) — a organização copia e publica nos
canais que ela usa com os PRÓPRIOS clientes (site, WhatsApp, impresso),
porque os clientes da empresa de bordado nunca fazem login no Prisma
(diferente de um SaaS B2C, aqui não existe uma "página pública por
tenant" nativa).

`retentionYears` tem validação de mínimo (`LGPD_MIN_RETENTION_YEARS = 5`,
`db/schema/privacy.ts`) — não deixa configurar abaixo do prazo de
prescrição tributária do CTN. O valor hoje é só declarativo: nenhum cron
lê `retentionYears` ainda para anonimizar automaticamente (fica como
pendência em `docs/lgpd-checklist.md`).

`app/privacidade/page.tsx` (pública) deixou de fingir ser o aviso de uma
empresa específica — reescrita para explicar o funcionamento multi-tenant
e apontar para `/lgpd` quem administra uma organização.

Dois cuidados técnicos replicando bugs já corrigidos nesta sessão:
`LGPD_MIN_RETENTION_YEARS`/`PrivacySettings` vivem em `core/privacy/types.ts`
(sem `"server-only"`), não em `settings.ts` — um Client Component
(`privacy-settings-form.tsx`) importando um arquivo `"server-only"`
quebra o bundle do cliente, mesma causa raiz do bug de
`"use server"`/const corrigido antes em `modules/clientes/actions.ts`.

Migration do drizzle-kit gerada (`0004_bent_hex.sql`, tabela
`organization_privacy_settings`) + RLS custom
(`migrations-custom/0008_lgpd_settings_rls.sql`, `apply_org_rls` padrão —
diferente de `lgpd_request_log`, aqui é configuração normal, a própria
organização precisa poder atualizar).

## 2026-09-25 (cont.) — Vencimento do saldo por pedido + "Clientes devendo" no painel

Pedido do usuário: ao registrar adiantamento/pagamento, poder indicar até
quando o saldo restante precisa ser pago, e o painel mostrar quem está
devendo, quanto, quanto já pagou e se está atrasado.

`pedidos.paymentDueDate` (coluna nova, `date` opcional) — editável junto
do `AdiantamentoForm` (mesmo formulário que já registra o adiantamento,
já implicitamente ligado a um cliente via `pedido.customerId` — não foi
necessário adicionar seleção de cliente em lugar nenhum nesse fluxo,
"indicar qual cliente" já é resolvido pelo pedido pertencer a um
cliente). Vazio limpa o vencimento (`parsed.data.paymentDueDate ?? null`).

`domain.ts#isOverdue(paymentDueDate, saldoCents, hoje)` — pura, testada
sem banco; nunca atrasado se o saldo já foi quitado, mesmo com data no
passado.

`domain.ts#isDebtStatus` — regra NOVA e DIFERENTE de `isReceivableStatus`
(que já existia): `isReceivableStatus` exclui `entregue` do pipeline de
vendas (decisão antiga, "cobrança sai do pipeline"); `isDebtStatus`
inclui `entregue` (só exclui `cancelado`), porque dívida de verdade
(dinheiro que falta entrar) é diferente de pipeline de venda — pedido
entregue e não pago é justamente o caso mais comum de cobrança
atrasada. As duas funções continuam separadas de propósito, mesmo
padrão de "lucro vs. saldo a receber nunca somados" já documentado
acima.

`queries.ts#listClientesComSaldoAReceber()` — agregação por cliente
(`group by customer_id`, `having sum(saldo_cents) > 0`) via SQL
(`sum`/`min ... filter`/`bool_or`), não em memória: total devido, total
pago, próximo vencimento (entre pedidos com saldo aberto) e se algum
está atrasado. Nova seção "Clientes devendo" no painel
(`app/(app)/page.tsx`), separada do KPI "Saldo a receber" (que continua
usando `isReceivableStatus`) — os dois números podem divergir de
propósito (um pedido entregue e não pago soma em "Clientes devendo" mas
não em "Saldo a receber"), então nunca devem ser confundidos como o
mesmo dado.

Bug pego pelos próprios testes: `emptyToUndefined` (`validation.ts`) só
tratava string vazia (`""`), não `null` (campo ausente do `FormData` —
caso real de um form HTML sem o campo preenchido, diferente de "preenchido
e depois apagado"). Corrigido para tratar os dois — afetava também
`deliveryDate`/`deliveryTime` do form de pedido, não só o campo novo.

## 2026-09-25 (cont.) — Adiantamento na criação do pedido + pagamento de cliente a partir do Financeiro

Dois pedidos do usuário, mesma linha de trabalho do vencimento por
pedido/"Clientes devendo":

**1. Adiantamento inicial na criação do pedido.** `PedidoForm` ganhou
campos opcionais "Adiantamento recebido agora" e "Vencimento do saldo",
ao lado dos campos de entrega já existentes. Schema separado
(`validation.ts#pedidoCreateSchema`, extende `pedidoHeaderSchema`) — de
propósito NÃO reaproveitado por `updatePedidoHeader` (edição do
cabeçalho depois de criado nunca deve poder tocar em
`adiantamentoCents`; isso é só de `AdiantamentoForm`/`registerAdiantamento`
a partir daqui). Nova orquestração `app/(app)/pedidos/novo/actions.ts#criarPedidoComAdiantamento`
(fora do módulo, mesmo padrão de `financeiro-actions.ts`): cria o pedido
e, se nasceu com adiantamento > 0, cria também o lançamento de `entrada`
correspondente em `financeiro` — sem isso, dinheiro recebido no fechamento
do pedido não apareceria em nenhum lugar do financeiro.

**2. Registrar pagamento de cliente a partir de `/financeiro`.** Nova
seção "Receber pagamento de cliente" (`app/(app)/financeiro/pagamento-cliente-form.tsx`),
acima do lançamento manual genérico: lista só clientes com saldo em
aberto (`pedidos#listClientesComSaldoAReceber`, já existia pro painel),
cascata pro select de qual PEDIDO daquele cliente está sendo pago (um
cliente pode ter mais de um em aberto ao mesmo tempo), valor e data.
Orquestração em `app/(app)/financeiro/pagamento-cliente-actions.ts#registrarPagamentoCliente`.

Precisou de uma peça nova em `pedidos`: `actions.ts#incrementarAdiantamento`
soma um DELTA ao adiantamento já registrado (diferente de
`registerAdiantamento`, que grava um TOTAL absoluto vindo do form da
ficha do pedido) — o valor natural de quem está lançando um pagamento a
partir do Financeiro é "quanto está pagando agora", não o agregado.
Nunca mexe em `paymentDueDate` (esse fluxo não tem campo de vencimento).

Os dois fluxos (ficha do pedido vs. Financeiro) convergem pro mesmo
lançamento em `financeiro_lancamentos` (`referenceType: "pedido"`) e pro
mesmo `pedidos.adiantamentoCents` — só a origem/UX muda.

## 2026-09-25 (cont.) — "Clientes devendo" no painel linka também os pedidos

`listClientesComSaldoAReceber` ganhou `pedidosEmAberto` (array por
cliente, via `json_agg(...) filter (where saldo_cents > 0)`) — a seção
"Clientes devendo" do painel agora linka pra cada pedido em aberto do
cliente (`#123`, `#145`...), não só pra ficha do cliente.

## 2026-09-25 (cont.) — Passe de visual no painel + cor `--warning` nova (validada)

Pedido do usuário: "deixar o visual do dash mais bonito, mantendo a
clareza dos dados". Skill de dataviz consultada antes de mexer em
qualquer cor (`references/choosing-a-form.md`, `marks-and-anatomy.md`,
`color-formula.md`).

Mudanças em `app/(app)/page.tsx`: KPIs ganharam `tone` (cor por assunto —
pedidos/clientes em azul via `primary`, entradas/lucro positivo em
verde via `success`, saídas/atrasado em vermelho via `destructive`,
"a receber"/"clientes devendo" em âmbar via `warning` novo), ícone
tintado permanente (não só no hover), leve elevação no hover
(`hover:-translate-y-0.5 hover:shadow-md`), grade de KPIs quebrada em
duas seções rotuladas ("Pedidos e clientes" / "Financeiro do mês"),
"Lucro do mês" com tom dinâmico (verde se >= 0, vermelho se negativo —
o sinal já vem no valor formatado também, nunca só a cor). Cabeçalho de
card ganhou o mesmo selo de ícone tintado (`IconBadge`) usado nos KPIs,
pra tudo no painel seguir a mesma linguagem visual. "Clientes devendo"
ganhou: total geral em aberto no cabeçalho (hero pequeno), um meter
(barra de progresso pago/devido) por cliente, e o badge "Atrasado"
promovido pra antes do nome (leitura mais rápida). Toda mudança manteve
ou reforçou rótulo de texto ao lado de qualquer cor — nunca um "dot"
sozinho carregando significado.

**Cor nova, validada**: tentei reaproveitar `chart-5` (hue 20) como
"warning" — `scripts/validate_palette.js` (skill de dataviz) acusou
FAIL: convertido pra hex, `chart-5` é `#f04c5a`/vermelho-salmão, quase
idêntico a `destructive` (`#e7000b`), ΔE normal-vision 8.4 (abaixo do
piso de 15 — indistinguível mesmo com visão de cor normal). Substituído
por uma cor âmbar dedicada (`--warning`, `oklch(0.75 0.16 75)` no claro,
`oklch(0.8 0.16 85)` no escuro — hue ~75-85, bem separado do vermelho de
`destructive` em ~22-27) validada contra `destructive`/`success`/
`primary` nos dois modos: piso normal-vision passa em ambos (>= 16),
CVD adjacente só WARN (não FAIL) entre `destructive`/`success` no modo
escuro — mesma classe de trade-off já aceita em
`entradas-saidas-chart.tsx` ("Recharts confinado a
`modules/financeiro/components`"), mitigada do mesmo jeito: cor nunca é
o único identificador, todo uso aqui tem rótulo de texto do lado. Ver
comentário em `globals.css` junto de `--color-warning`.

Não rodei o app num navegador de verdade nesta sessão (rota autenticada,
sem sessão de login disponível aqui) — validei build de produção +
typecheck + lint, mas a checagem visual final da skill ("renderizar e
olhar") fica pendente pra quando alguém abrir o painel de verdade.

## 2026-09-25 (cont.) — Dois bugs reportados pelo usuário + previsão de caixa

**Bug 1 — aviso do Base UI em `AdiantamentoForm`.** "A component is
changing the default value state of an uncontrolled FieldControl after
being initialized." Causa: o `<input type="date">` de `paymentDueDate`
usa `defaultValue` (campo não controlado, ver memória do usuário sobre
nunca apagar dado válido — `defaultValue` é a técnica certa). Depois de
um salvamento bem-sucedido, `revalidatePath` faz a página buscar o
pedido de novo e `AdiantamentoForm` recebe um `paymentDueDate` NOVO via
prop, mas sem remount (sem `key` mudando), o Base UI detecta a
divergência entre o valor inicial e o atual do campo não controlado e
avisa. Corrigido com `key={pedido.updatedAt.toString()}` no
`<AdiantamentoForm>` (`app/(app)/pedidos/[id]/page.tsx`) — mesmo padrão
já usado em `ClienteForm`. Isso é DIFERENTE de resetar em erro de
validação (nunca fazer): aqui é depois de SALVAR com sucesso, quando os
campos devem mesmo refletir o valor confirmado pelo servidor.

**Bug 2 — "Vence" no painel mostrando um dia a menos.** Causa: colunas
`date` do Postgres (sem hora) chegam como string `"YYYY-MM-DD"`; `new
Date("YYYY-MM-DD")` interpreta como meia-noite UTC, que em qualquer fuso
atrás de UTC (Brasil inteiro) já virou o dia anterior ao formatar no
horário local. `core/format.ts#formatDate`/`formatDateTime`/`formatRelative`
agora detectam esse formato (`parseDate`, regex `YYYY-MM-DD`) e tratam
como horário LOCAL (`T00:00:00`, sem `Z`) — mesmo ajuste que
`domain.ts#isOverdue` já fazia, mas que faltava no formatador usado pela
UI. Esse bug afetava qualquer `date` puro exibido no sistema
(`deliveryDate`, `orderDate`, `nextDueDate` de organização em
`/admin`), não só `paymentDueDate` — corrigido de uma vez, centralizado.
Teste novo em `core/__tests__/format.test.ts` cobrindo o caso.

**Previsão de caixa.** Pedido do usuário: uma métrica de quanto está pra
entrar/sair, pra projeção/orçamento. Nova seção no painel ("Previsão de
caixa — próximos 30 dias"), 3 números: A receber (soma de
`pedidos.saldoCents` com `paymentDueDate` entre hoje e +30 dias — nunca
inclui atrasado, isso já é "Clientes devendo", nem pedido sem
vencimento), A pagar, Saldo previsto (A receber − A pagar, tom
verde/vermelho dinâmico). `pedidos#getPrevisaoRecebimentos` (novo) +
`financeiro#getPrevisaoDespesas` (novo), compostos na página (nenhum dos
dois módulos importa o outro).

**Limitação documentada, não escondida**: "A pagar" só soma saídas que o
usuário JÁ lançou em `financeiro` com `date` no futuro — o schema atual
não tem nenhum conceito de despesa recorrente/agendada (não existe
"contas a pagar" de verdade). Fica visível no `Hint` do card e aqui:
se o usuário quiser uma previsão de saída mais completa (aluguel todo
mês, por exemplo, sem precisar lançar manualmente toda vez), isso é uma
feature nova (despesas recorrentes), fora do escopo desta entrega.
`pedidos#getPrevisaoRecebimentos` também expõe `semPrevisaoCents` (saldo
aberto sem vencimento definido) — mostrado como ressalva textual, nunca
somado ao número principal.

## 2026-09-25 (cont.) — Rastreabilidade da Previsão de caixa + hints reorganizados

Pedido do usuário: dá pra clicar em "A receber"/"A pagar" da Previsão de
caixa e ver exatamente quais registros compõem aquele número; hints
específicos de cada estatística ficam ao lado dela (não um hint genérico
no título do card, que virou uma `CardDescription` curta); e explicar
por que "Saldo a receber" (KPI já existente) é diferente de "A receber"
(Previsão) — não é bug, são duas perguntas diferentes.

**Rastreabilidade**: `pedidos#listPedidos` ganhou
`vencimentoProximos30Dias` (mesmo filtro exato de
`getPrevisaoRecebimentos`) — `/pedidos?previsao=30dias` mostra só esses
pedidos, com coluna "Vencimento" (+ badge "Atrasado" se aplicável) no
lugar da coluna "Entrega" nesse modo, e um banner explicando o filtro
com link "Limpar filtro". `financeiro#listLancamentos` ganhou `futuras`
(mesmo filtro de `getPrevisaoDespesas`) — `/financeiro?previsao=30dias`
mostra só as saídas futuras que compõem o número, mesmo padrão de
banner. Os dois números da Previsão de caixa agora são links pra essas
views filtradas.

**Hints movidos**: o hint único que ficava no título do card "Previsão
de caixa" virou um `Hint` em cada estatística (`A receber`/`A pagar`),
mais específico. O título do card agora tem só uma `CardDescription`
curta e geral ("uma projeção do que deve entrar e sair... diferente do
resto do painel, que mostra o que já aconteceu").

**"Saldo a receber" vs. "A receber"**: não é erro — são métricas
DIFERENTES de propósito (mesma família de decisão já documentada acima,
"`isReceivableStatus` vs. `isDebtStatus`"). "Saldo a receber" (KPI,
`isReceivableStatus`) soma todo pedido NÃO terminal, sem olhar
vencimento — é "pipeline". "A receber" (Previsão, `getPrevisaoRecebimentos`)
só conta quem tem vencimento marcado nos próximos 30 dias e TAMBÉM
inclui pedido `entregue` com saldo aberto — é "o que tem data pra
entrar". Adicionado um `Hint` no KPI "Saldo a receber" explicando essa
diferença, pra ninguém achar que é inconsistência.

**Problema técnico resolvido no caminho**: `Hint` renderiza um
`<button>`; colocar um `Hint` dentro de um `<Link>` (que vira `<a>`)
quebra HTML (`<button>` não pode ficar dentro de `<a>`). Em "A
receber"/"A pagar" da Previsão, resolvido separando rótulo+hint (fora do
link) do valor (dentro do link). No `KpiCard` (usado por "Saldo a
receber"), resolvido diferente — o card inteiro precisa continuar
clicável, então o `<Link>` virou uma camada `absolute inset-0` DENTRO do
`Card` (não mais o `Card` inteiro dentro do `<Link>`), com o conteúdo
visível por cima em `pointer-events-none` exceto a linha do rótulo
(que reativa `pointer-events-auto` só quando há `hint`, pra não tirar
clique do resto dos KPIs que não têm hint nenhum).

## 2026-09-25 (cont.) — "A receber"/"A pagar" com elevação; bug de stacking nos hints

Pedido do usuário: em vez de sublinhado no link, "A receber"/"A pagar"
da Previsão de caixa devem elevar no hover igual aos outros cards do
painel — criado `PrevisaoStat`, uma "mini-card" com a mesma elevação de
`KpiCard` (`hover:-translate-y-0.5 hover:shadow-md`), moldura tintada
por `tone`. Sem `href` (caso do "Saldo previsto") vira só texto
estático, sem moldura — só o que é clicável parece clicável.

**Bug encontrado no caminho, reportado pelo usuário**: os hints desses
cards (e do KPI "Saldo a receber") não respondiam ao hover. Causa: a
técnica de "link em camada" (`<Link className="absolute inset-0" />`
dentro do card, conteúdo por cima) tinha um furo — um elemento
`position: absolute` pinta ACIMA de conteúdo não-posicionado no mesmo
contexto de empilhamento, independente da ordem no DOM. Isso significa
que o `Link` ficava visualmente por cima do botão do `Hint` mesmo com
`pointer-events-auto` nele: o navegador faz hit-test pelo elemento do
TOPO visual, não só por quem tem `pointer-events` habilitado — então o
hover nunca alcançava o botão. `pointer-events` sozinho não resolve
esse tipo de sobreposição; precisa também tirar o conteúdo do fluxo
normal pra ele competir na mesma "camada" de empilhamento. Corrigido
dando ao wrapper do conteúdo (`CardContent` no `KpiCard`, a `div`
interna no `PrevisaoStat`) `relative z-10` — agora ele também é
posicionado, com `z-index` explicitamente maior que o do `Link` (que
fica em 0/auto), e pinta por cima de verdade. Comentário atualizado nos
dois componentes com essa pegadinha, pra não repetir o erro numa
variação futura desse padrão.

## 2026-09-25 (cont.) — Rede de segurança de logs + telas de erro + marca no login

Perguntado pelo usuário, já com o sistema publicado
(`prisma-bordados.vercel.app`): onde ver logs de erro quando algo
quebrar pro cliente, e se o sistema está bem estruturado com logs onde
importa.

**Gap real encontrado**: nenhuma Server Action dos módulos de negócio
(`clientes`, `pedidos`, `financeiro`, `fiscal`, `catalogo-bordado`) tem
`try/catch` em volta das operações de banco — um erro inesperado sobe
cru, sem passar pelo `core/logger.ts` estruturado que `core/admin`,
`core/live-support`, `core/notifications` e os crons já usam. Não
"perde" o erro (o Next.js/Vercel captura e mostra nos Runtime Logs de
qualquer jeito), mas sem `requestId`/contexto de negócio amarrado,
dificultando cruzar "qual organização, em qual ação" quando um cliente
reporta um problema.

Corrigido com `instrumentation.ts#onRequestError` (Next 16, API nova —
ver `node_modules/next/dist/docs/.../instrumentation.md`, consultado
antes por causa do aviso em AGENTS.md sobre não assumir API de treino):
roda automaticamente pro Next.js toda vez que captura um erro de
servidor (Server Component, Route Handler OU Server Action —
`routeType: "action"` cobre exatamente o caso sem `try/catch`), mesmo
sem nenhum código de aplicação pedindo. Fica em `instrumentation.ts` na
RAIZ do repo (não em `src/`), mesmo lugar de `proxy.ts` — convenção já
estabelecida aqui, diferente do padrão comum de outros projetos Next
que colocam dentro de `src/`.

Também criados `app/error.tsx`/`app/global-error.tsx` (não existia
nenhum) — antes, um erro inesperado numa página derrubava pra tela
genérica do Next.js, sem "tentar de novo" e sem nada explicando o que
aconteceu.

**Tela de login com marca**: ícone (`Gem`, lucide-react) + "Prisma" +
slogan ("Gestão completa para empresas de bordado") + selo "Conexão
segura" — pedido do usuário pra passar mais profissionalismo/confiança
logo de cara. `/` sem sessão já redirecionava pra `/login`
(`PUBLIC_PATHS` em `core/supabase/middleware.ts`) — não precisou mexer
nisso, só confirmado que já funcionava.
