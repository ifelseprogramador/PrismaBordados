# Checklist de LGPD

Este documento existe porque o Prisma trata dado pessoal de terceiros
(clientes da empresa que usa o sistema — CPF/CNPJ, telefone, endereço,
e-mail, em `modules/clientes`) e a empresa que opera o Prisma é
**controladora** desses dados perante a LGPD (Lei 13.709/2018), mesmo que
o Prisma seja só o software. Isso vale mesmo para uma única organização
pequena — a LGPD não tem piso de tamanho de empresa.

Convenção de status usada abaixo:

- ✅ **Implementado** — existe em código, com o arquivo que faz isso.
- ⚠️ **Parcial** — existe algo, mas não cobre o caso todo.
- ⬜ **Pendente (código)** — dá para resolver em código, ainda não feito.
- 📋 **Pendente (processo/jurídico)** — não é código; é decisão de
  negócio, texto legal, ou processo operacional. Nenhum agente de código
  resolve isso sozinho.

## 1. Direitos do titular (Art. 18)

| Direito                                          | Status | Onde                                                                                                                                                                                                                                                                  |
| ------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirmação de tratamento / acesso aos dados     | ✅     | `getClienteById` (`modules/clientes/queries.ts`) já mostra tudo que existe sobre um cliente na ficha dele.                                                                                                                                                            |
| Portabilidade (exportar)                         | ✅     | `exportarDadosCliente` (`app/(app)/clientes/[id]/privacy-actions.ts`) + botão "Exportar dados (LGPD)" (`modules/clientes/components/cliente-privacy-actions.tsx`) — baixa um `.json` com o cadastro e o resumo dos pedidos do titular.                                |
| Eliminação (excluir/anonimizar)                  | ✅     | `solicitarExclusaoCliente` decide entre `deleteCliente` (sem histórico) e `anonymizeCliente` (com histórico — sobrescreve nome/documento/telefone/endereço/e-mail, mantém a linha só para não quebrar a FK de `pedidos`). Botão "Excluir dados" na mesma tela.        |
| Correção de dado incompleto/desatualizado        | ✅     | `updateCliente` já existia (Fase 2) — agora bloqueado depois de anonimizado (`isNull(clientes.anonymizedAt)` no `where`).                                                                                                                                             |
| Oposição / revogação de consentimento            | 📋     | Só faz sentido depois que a base legal do tratamento estiver definida (item 2). Se a base for "execução de contrato" (provável aqui — o cliente contrata um serviço de bordado), não existe "consentimento" para revogar nesse tratamento específico; ver Art. 7º, V. |
| Informação sobre com quem o dado é compartilhado | 📋     | Relevante quando o provedor fiscal for escolhido (o CPF/CNPJ e endereço do cliente são enviados a ele para emitir a nota) — depende da decisão de provedor (ver README, seção "fiscal").                                                                              |

## 2. Base legal e finalidade (Art. 7º, 9º)

📋 **Pendente (processo/jurídico).** Nenhuma linha de código resolve
isto — é uma decisão documentada, normalmente no aviso de privacidade
(item 5). Para o Prisma, a base mais natural para os dados de
`clientes` é **execução de contrato** (Art. 7º, V): a empresa precisa do
nome/telefone/endereço do cliente para produzir e entregar o pedido de
bordado, e do CPF/CNPJ para emitir a nota fiscal (obrigação legal, Art.
7º, II, reforça a mesma base). Registrar isso explicitamente no aviso de
privacidade evita depender de "consentimento" (que, ao contrário do que
muita gente assume, não é a base padrão nem a mais robusta para dado de
cliente de um contrato comercial).

## 3. Registro de operações / accountability (Art. 37)

| Item                                                        | Status | Onde                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Log de export/anonimização/exclusão de dado pessoal         | ✅     | Tabela `lgpd_request_log` (`db/schema/privacy.ts`) + `recordLgpdAction` (`core/audit-log.ts`), chamado de dentro da mesma transação de cada operação — nunca a operação sem o log. RLS padrão de organização (`migrations-custom/0007_lgpd_rls.sql`) — cada organização só vê o próprio log. |
| Log é append-only (ninguém edita/apaga o próprio histórico) | ✅     | `migrations-custom/0007_lgpd_rls.sql` define policy própria (não usa `apply_org_rls`) — só SELECT/INSERT, nenhuma policy de UPDATE/DELETE, então o Postgres nega os dois por padrão.                                                                                                         |
| Segredos nunca em log de aplicação                          | ✅     | Já existia (`core/logger.ts#SENSITIVE_KEY_PATTERN`) — cobre `cpf`/`cnpj`/`documento`/senha/token/etc. em qualquer log estruturado.                                                                                                                                                           |

## 4. Segurança técnica (Art. 46-49)

| Item                                                            | Status | Onde                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Isolamento entre organizações (multi-tenant)                    | ✅     | RLS ativa desde o commit inicial, validada contra Postgres real com 2 organizações reais — ver `docs/decisoes.md`, "RLS ativa desde o início" e "RLS validada contra Postgres real". Isso é proteção de acesso, pré-requisito de qualquer conformidade, mas não é a LGPD inteira. |
| Segredos de provedor fiscal fora de texto puro                  | ⚠️     | `modules/fiscal/crypto-placeholder.ts` é uma codificação reversível (base64), documentada no próprio arquivo como **insuficiente para produção**. Trocar por Supabase Vault/KMS antes de ativar emissão fiscal real (ver resposta anterior sobre o módulo `fiscal`).              |
| Criptografia de dado pessoal em repouso (CPF/CNPJ/endereço)     | ⬜     | Hoje em texto puro no Postgres, protegido só pela RLS + acesso ao banco. Não é estritamente exigido pela LGPD para todo dado (CPF/CNPJ não é "dado sensível" no sentido do Art. 5º, II), mas é boa prática. Ver "Pendências técnicas".                                            |
| Log de quem acessou a ficha de um cliente (não só quem alterou) | ⬜     | Fora de escopo desta entrega — hoje só operações de escrita (export/anonimizar/excluir) são registradas, não toda leitura.                                                                                                                                                        |

## 5. Aviso de privacidade

⚠️ **Parcial — mecanismo pronto, conteúdo jurídico ainda pendente.**
O Prisma é multi-tenant (cada organização é uma empresa de bordado
diferente, cada uma controladora dos PRÓPRIOS dados), então um único
texto fixo publicado numa URL não serve — não existe "a" empresa por
trás do sistema. A solução: **cada organização preenche seus próprios
dados** (razão social, CNPJ, endereço, encarregado, prazo de retenção)
em `/lgpd` (`app/(app)/lgpd/page.tsx`, autenticado, um formulário —
`core/privacy/components/privacy-settings-form.tsx`) e o sistema **gera
automaticamente** o texto do aviso de privacidade a partir desses dados
(`core/privacy/components/privacy-notice-preview.tsx`, com botão
"Copiar texto"). A organização copia esse texto pronto e publica nos
canais que ela usa com os próprios clientes (site, WhatsApp, impresso no
pedido) — o Prisma não publica isso automaticamente numa página pública,
porque os clientes da empresa de bordado nunca fazem login no sistema.

`/privacidade` (pública, sem login) deixou de fingir ser o aviso de uma
empresa específica — agora explica esse funcionamento (multi-tenant) e
aponta quem procura o aviso de uma empresa para pedir direto a ela.

**Ainda pendente**: o TEXTO gerado é um modelo, não texto jurídico
definitivo — vale revisão de um advogado antes de cada organização
publicar oficialmente. Isso é decisão de cada organização cliente do
Prisma, não algo que se resolve uma vez só no código.

## 6. Encarregado de dados (DPO) — Art. 41

✅ **Implementado (mecanismo)** — campo "Encarregado de dados (DPO)" +
"Contato do encarregado" em `/lgpd`, por organização (tabela
`organization_privacy_settings`, `db/schema/privacy.ts`). 📋 **Ainda
pendente**: cada organização real precisa efetivamente preencher com o
nome/contato de uma pessoa de verdade — isso é decisão da empresa, o
campo só existe vazio até alguém preencher.

## 7. Retenção e descarte

⚠️ **Parcial.** O campo "Prazo de retenção de dados fiscais (anos)" em
`/lgpd` já existe, por organização, com **validação que impede configurar
menos que 5 anos** (`LGPD_MIN_RETENTION_YEARS`, `db/schema/privacy.ts` —
é o prazo de prescrição tributária do CTN, Art. 173/174, abaixo do qual a
empresa ficaria sem prova fiscal dentro do prazo legal). Isso resolve a
parte de "a organização pode declarar/documentar seu prazo".

📋⬜ **Ainda pendente**: o número configurado hoje é só INFORMATIVO — não
existe nenhuma automação que de fato anonimize um cliente sozinho depois
de X anos sem pedido. Depois que cada organização confirmar o prazo que
quer usar, dá pra automatizar com um cron (mesmo padrão de
`api/cron/backup/route.ts`) que leria `retentionYears` de cada
organização e chamaria `anonymizeCliente` para clientes sem pedido
recente dentro desse prazo.

## 8. Incidente de segurança (Art. 48)

📋 **Pendente (processo).** A LGPD exige notificar a ANPD e os titulares
afetados em caso de vazamento que possa gerar risco/dano relevante.
Nenhum plano de resposta a incidente existe hoje — isso é documentação
operacional (quem aciona quem, em quanto tempo), não código.

## 9. Sub-processadores (Supabase + futuro provedor fiscal)

📋 **Pendente (processo).** Supabase já opera como operador de dados
compatível com LGPD/GDPR (tem DPA próprio), mas isso não dispensa a
empresa de: (1) confirmar a região dos dados (`sa-east-1`, São Paulo, já
é a escolha documentada no README — mantém o dado no Brasil); (2) repetir
a mesma verificação para o provedor fiscal escolhido, porque ele também
vai processar CPF/CNPJ/endereço do titular.

---

## Pendências técnicas (o que ainda falta implementar aqui)

Em ordem sugerida de prioridade:

1. **Cron de retenção automática**, lendo `retentionYears` de
   `organization_privacy_settings` por organização (item 7 acima) — hoje
   o campo é só declarativo/informativo.
2. **Consentimento/aviso para o widget de suporte ao vivo** —
   `core/live-support/components/live-support-widget.tsx` já menciona
   "consentimento" para a gravação de tela repassada ao admin; vale
   confirmar que esse fluxo também está coberto (não auditado nesta
   sessão, escopo era `clientes`).

## O que este agente NÃO pode resolver por código

Os campos abaixo agora TÊM ONDE ser preenchidos (`/lgpd`, por
organização) — o que falta é o conteúdo real, que é decisão de cada
organização que usa o Prisma, não deste agente:

- Razão social, CNPJ e endereço real de cada empresa controladora.
- Nome e contato de uma pessoa real como encarregado de dados (DPO).
- O prazo de retenção que cada organização efetivamente quer usar (o
  sistema só impede configurar abaixo do mínimo legal de 5 anos).
- Plano de resposta a incidente (processo humano).
- Textos legais do aviso de privacidade e termos de uso — um advogado
  deveria revisar o placeholder antes de publicar.
- Confirmação contratual (DPA) com o Supabase e com o futuro provedor
  fiscal — são documentos que a empresa assina, não código.
