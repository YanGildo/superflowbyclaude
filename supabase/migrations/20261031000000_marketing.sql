-- Fase 4 · Marketing
-- Plano de marketing por mês (antes: um por negócio) e métricas de campanha para o Dashboard de Campanhas.
alter table public.marketing_plans add column month text not null default to_char(current_date, 'YYYY-MM');
alter table public.marketing_plans drop constraint if exists marketing_plans_workspace_id_business_id_key;
create unique index marketing_plans_month_uidx on public.marketing_plans (workspace_id, coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid), month);

alter table public.campaigns
  add column impressions int not null default 0,
  add column clicks      int not null default 0,
  add column region      text;

-- Entregas também filtram por negócio.
alter table public.deliveries add column business_id uuid references public.businesses(id) on delete set null;
