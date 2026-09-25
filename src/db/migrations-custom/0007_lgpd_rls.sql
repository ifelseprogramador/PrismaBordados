-- RLS de lgpd_request_log — a organização precisa poder gravar e
-- consultar (para conseguir demonstrar conformidade com a LGPD se
-- auditada), diferente de audit_log (só admin da plataforma). Mas,
-- diferente de `apply_org_rls` (usado no resto do projeto), NÃO cria
-- policy de UPDATE nem DELETE: um log de conformidade que a própria
-- organização auditada pode editar ou apagar não serve como prova de
-- nada. Sem policy de UPDATE/DELETE, o Postgres nega os dois por padrão
-- (RLS "fail closed") — nem a própria organização, nem um bug de
-- aplicação, conseguem alterar uma linha já gravada. Ver
-- docs/lgpd-checklist.md, "Pendências técnicas".

alter table "lgpd_request_log" enable row level security;

create policy "lgpd_request_log_select_own_org" on "lgpd_request_log"
  for select to authenticated
  using (organization_id in (select public.current_org_ids()) or public.is_current_user_platform_admin());

create policy "lgpd_request_log_insert_own_org" on "lgpd_request_log"
  for insert to authenticated
  with check (organization_id in (select public.current_org_ids()) or public.is_current_user_platform_admin());
