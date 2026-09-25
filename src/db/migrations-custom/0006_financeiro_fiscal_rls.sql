-- RLS dos módulos `financeiro` e `fiscal` (Fase 3/4). Mesmo padrão de
-- 0005_modulos_bordados_rls.sql: `apply_org_rls()` cobre as 3 tabelas —
-- todas têm `organization_id` próprio (`fiscal_credentials` usa
-- `organization_id` como a própria PK, mas a função só exige a coluna
-- existir, não que seja a PK — ver 0001_rls_policies.sql#apply_org_rls).

select public.apply_org_rls('financeiro_lancamentos');
select public.apply_org_rls('fiscal_credentials');
select public.apply_org_rls('fiscal_notas');
