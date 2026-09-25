-- RLS de organization_privacy_settings — padrão comum de organização
-- (diferente de lgpd_request_log, que é append-only: aqui é uma
-- configuração normal, a própria organização precisa poder ler E
-- atualizar os próprios dados). Ver docs/lgpd-checklist.md.

alter table "organization_privacy_settings" enable row level security;
select public.apply_org_rls('organization_privacy_settings');
