-- Relatórios de anúncios importados (Meta, Google, TikTok…) por nível: campanha, conjunto e anúncio.
-- Cada linha tem uma chave (plataforma + nível + período + nomes/IDs): importar de novo o mesmo relatório atualiza, não duplica.
-- Depois de importar, os totais por campanha vão para o Dashboard de Campanhas (tabela campaigns).

create table if not exists public.ad_metrics (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  business_id    uuid references public.businesses(id) on delete set null,
  platform       text not null default 'Meta Ads',
  level          text not null check (level in ('campanha', 'conjunto', 'anuncio')),
  date_start     date not null,
  date_end       date not null,
  campaign_name  text not null,
  adset_name     text,
  ad_name        text,
  campaign_ext   text,
  adset_ext      text,
  ad_ext         text,
  spend          numeric(14,2) not null default 0,
  impressions    bigint not null default 0,
  reach          bigint not null default 0,
  clicks         bigint not null default 0,
  link_clicks    bigint not null default 0,
  results        numeric(14,2) not null default 0,
  result_type    text,
  leads          numeric(14,2) not null default 0,
  purchases      numeric(14,2) not null default 0,
  revenue        numeric(14,2) not null default 0,
  row_key        text not null,
  imported_at    timestamptz not null default now(),
  unique (workspace_id, row_key)
);
create index if not exists ad_metrics_ws_dates on public.ad_metrics (workspace_id, date_start, date_end);

alter table public.campaigns add column if not exists external_key text;
create unique index if not exists campaigns_external_key on public.campaigns (workspace_id, external_key) where external_key is not null;

alter table public.ad_metrics enable row level security;
drop policy if exists ad_metrics_read on public.ad_metrics;
drop policy if exists ad_metrics_write on public.ad_metrics;
create policy ad_metrics_read on public.ad_metrics for select using (public.member_level(workspace_id, 'marketing') >= 1);
create policy ad_metrics_write on public.ad_metrics for all using (public.member_level(workspace_id, 'marketing') >= 2)
  with check (public.member_level(workspace_id, 'marketing') >= 2);
revoke all on public.ad_metrics from anon;
grant select, insert, update, delete on public.ad_metrics to authenticated;

/** Recalcula as campanhas do Dashboard a partir dos relatórios: usa o nível mais completo que existir para cada campanha. */
create or replace function public.sync_ad_campaigns(_ws uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; r record;
begin
  if public.member_level(_ws, 'marketing') < 2 then raise exception 'Você não tem permissão de edição no Marketing deste espaço.'; end if;
  for r in
    with lv as (
      select platform, campaign_name,
             case when bool_or(level = 'campanha') then 'campanha' when bool_or(level = 'conjunto') then 'conjunto' else 'anuncio' end as use_level
      from public.ad_metrics where workspace_id = _ws group by platform, campaign_name
    )
    select m.platform, m.campaign_name, max(m.business_id::text)::uuid as business_id,
           sum(m.spend) spend, sum(m.impressions) impressions,
           sum(case when m.link_clicks > 0 then m.link_clicks else m.clicks end) clicks,
           sum(m.leads) leads, sum(m.purchases) purchases, sum(m.revenue) revenue,
           min(m.date_start) d0, max(m.date_end) d1
    from public.ad_metrics m join lv on lv.platform = m.platform and lv.campaign_name = m.campaign_name and m.level = lv.use_level
    where m.workspace_id = _ws
    group by m.platform, m.campaign_name
  loop
    insert into public.campaigns (workspace_id, business_id, name, platform, objective, status, spend, impressions, clicks, leads, sales, revenue,
                                  start_date, end_date, external_key, notes)
    values (_ws, r.business_id, left(r.campaign_name, 200), r.platform, case when r.leads > 0 then 'Leads' end, 'ativa',
            r.spend, least(r.impressions, 2147483647)::int, least(r.clicks, 2147483647)::int, round(r.leads)::int, round(r.purchases)::int, r.revenue,
            r.d0, r.d1, 'ads:' || r.platform || ':' || r.campaign_name, 'Números vindos dos relatórios importados.')
    on conflict (workspace_id, external_key) where external_key is not null do update set
      spend = excluded.spend, impressions = excluded.impressions, clicks = excluded.clicks, leads = excluded.leads,
      sales = excluded.sales, revenue = excluded.revenue, start_date = excluded.start_date, end_date = excluded.end_date,
      business_id = coalesce(campaigns.business_id, excluded.business_id), updated_at = now();
    n := n + 1;
  end loop;
  return n;
end $$;

/**
 * Importa linhas de relatório já lidas no navegador. Chave = plataforma|nível|início|fim|campanha|conjunto|anúncio (IDs quando houver).
 * Linha igual à que já existe = ignorada; mesma chave com números novos = atualizada; chave nova = criada.
 */
create or replace function public.import_ad_metrics(_ws uuid, _business uuid, _rows jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb; k text; old public.ad_metrics; n_new int := 0; n_upd int := 0; n_same int := 0; errs jsonb := '[]'::jsonb; camps int;
  v_spend numeric; v_imp bigint; v_reach bigint; v_clk bigint; v_link bigint; v_res numeric; v_leads numeric; v_pur numeric; v_rev numeric;
begin
  if public.member_level(_ws, 'marketing') < 2 then raise exception 'Você não tem permissão de edição no Marketing deste espaço.'; end if;
  if jsonb_typeof(_rows) <> 'array' or jsonb_array_length(_rows) > 5000 then raise exception 'Envie até 5000 linhas por vez.'; end if;
  for r in select * from jsonb_array_elements(_rows) loop
    begin
      if coalesce(trim(r->>'campaign_name'), '') = '' then raise exception 'Linha sem nome de campanha.'; end if;
      k := concat_ws('|', r->>'platform', r->>'level', r->>'date_start', r->>'date_end',
                     coalesce(nullif(r->>'campaign_ext', ''), lower(trim(r->>'campaign_name'))),
                     coalesce(nullif(r->>'adset_ext', ''), lower(trim(coalesce(r->>'adset_name', '')))),
                     coalesce(nullif(r->>'ad_ext', ''), lower(trim(coalesce(r->>'ad_name', '')))));
      v_spend := coalesce((r->>'spend')::numeric, 0); v_imp := coalesce((r->>'impressions')::numeric, 0)::bigint;
      v_reach := coalesce((r->>'reach')::numeric, 0)::bigint; v_clk := coalesce((r->>'clicks')::numeric, 0)::bigint;
      v_link := coalesce((r->>'link_clicks')::numeric, 0)::bigint; v_res := coalesce((r->>'results')::numeric, 0);
      v_leads := coalesce((r->>'leads')::numeric, 0); v_pur := coalesce((r->>'purchases')::numeric, 0); v_rev := coalesce((r->>'revenue')::numeric, 0);
      select * into old from public.ad_metrics where workspace_id = _ws and row_key = k;
      if found and old.spend = v_spend and old.impressions = v_imp and old.clicks = v_clk and old.link_clicks = v_link
               and old.results = v_res and old.leads = v_leads and old.purchases = v_pur and old.revenue = v_rev then
        n_same := n_same + 1; continue;
      end if;
      insert into public.ad_metrics (workspace_id, business_id, platform, level, date_start, date_end, campaign_name, adset_name, ad_name,
        campaign_ext, adset_ext, ad_ext, spend, impressions, reach, clicks, link_clicks, results, result_type, leads, purchases, revenue, row_key)
      values (_ws, _business, coalesce(r->>'platform', 'Meta Ads'), r->>'level', (r->>'date_start')::date, (r->>'date_end')::date,
        left(trim(r->>'campaign_name'), 300), left(nullif(trim(r->>'adset_name'), ''), 300), left(nullif(trim(r->>'ad_name'), ''), 300),
        nullif(r->>'campaign_ext', ''), nullif(r->>'adset_ext', ''), nullif(r->>'ad_ext', ''),
        v_spend, v_imp, v_reach, v_clk, v_link, v_res, left(nullif(r->>'result_type', ''), 120), v_leads, v_pur, v_rev, k)
      on conflict (workspace_id, row_key) do update set
        spend = excluded.spend, impressions = excluded.impressions, reach = excluded.reach, clicks = excluded.clicks,
        link_clicks = excluded.link_clicks, results = excluded.results, result_type = coalesce(excluded.result_type, ad_metrics.result_type),
        leads = excluded.leads, purchases = excluded.purchases, revenue = excluded.revenue,
        business_id = coalesce(excluded.business_id, ad_metrics.business_id), imported_at = now();
      if old.id is null then n_new := n_new + 1; else n_upd := n_upd + 1; end if;
    exception when others then
      errs := errs || jsonb_build_object('line', r->>'line', 'erro', sqlerrm);
    end;
  end loop;
  camps := public.sync_ad_campaigns(_ws);
  return jsonb_build_object('novos', n_new, 'atualizados', n_upd, 'iguais', n_same, 'campanhas', camps, 'erros', errs);
end $$;

revoke execute on function public.import_ad_metrics(uuid, uuid, jsonb), public.sync_ad_campaigns(uuid) from public, anon;
grant execute on function public.import_ad_metrics(uuid, uuid, jsonb), public.sync_ad_campaigns(uuid) to authenticated;
