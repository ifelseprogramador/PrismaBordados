-- RLS dos módulos de negócio do vertical bordados (Fase 2). Mesmo padrão
-- de 0001_rls_policies.sql: `apply_org_rls()` para tabelas com
-- `organization_id` próprio. `pedido_itens` é o caso especial (sem
-- `organization_id` próprio, RLS via join com `pedidos`) — mesmo padrão
-- de `work_order_items` no mecano-erp, adaptado ao contrato de RLS ativa
-- do BaseERP/Prisma (current_org_ids() via GUC de sessão, não bypassrls).

select public.apply_org_rls('clientes');
select public.apply_org_rls('catalogo_bordado_itens');
select public.apply_org_rls('pedido_counters');
select public.apply_org_rls('pedidos');

alter table "pedido_itens" enable row level security;

create policy "pedido_itens_select_own_org" on "pedido_itens"
  for select to authenticated
  using (
    exists (
      select 1 from pedidos p
      where p.id = pedido_itens.pedido_id
        and (p.organization_id in (select public.current_org_ids())
             or public.is_current_user_platform_admin())
    )
  );

create policy "pedido_itens_insert_own_org" on "pedido_itens"
  for insert to authenticated
  with check (
    exists (
      select 1 from pedidos p
      where p.id = pedido_itens.pedido_id
        and (p.organization_id in (select public.current_org_ids())
             or public.is_current_user_platform_admin())
    )
  );

create policy "pedido_itens_update_own_org" on "pedido_itens"
  for update to authenticated
  using (
    exists (
      select 1 from pedidos p
      where p.id = pedido_itens.pedido_id
        and (p.organization_id in (select public.current_org_ids())
             or public.is_current_user_platform_admin())
    )
  )
  with check (
    exists (
      select 1 from pedidos p
      where p.id = pedido_itens.pedido_id
        and (p.organization_id in (select public.current_org_ids())
             or public.is_current_user_platform_admin())
    )
  );

create policy "pedido_itens_delete_own_org" on "pedido_itens"
  for delete to authenticated
  using (
    exists (
      select 1 from pedidos p
      where p.id = pedido_itens.pedido_id
        and (p.organization_id in (select public.current_org_ids())
             or public.is_current_user_platform_admin())
    )
  );
