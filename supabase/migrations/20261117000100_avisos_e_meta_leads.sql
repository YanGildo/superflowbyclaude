-- Avisos de lead novo por e-mail (fila + envio pela função send-notifications)
-- e recebimento automático de leads do Meta (função meta-leads). Não mexe em site_capture_lead nem em site_lead_targets.

/* ------------------------------ Avisos ------------------------------ */
create table if not exists public.lead_alerts (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  pipeline_id  uuid references public.pipelines(id) on delete cascade,   -- null = qualquer campanha do espaço
  emails       text[] not null default '{}',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (workspace_id, pipeline_id)
);

create table if not exists public.notification_outbox (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind         text not null default 'lead_novo',
  to_emails    text[] not null,
  subject      text not null,
  body         text not null,
  status       text not null default 'pendente' check (status in ('pendente', 'enviado', 'falhou')),
  attempts     int not null default 0,
  error        text,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);
create index if not exists notification_outbox_pending on public.notification_outbox (status, created_at) where status = 'pendente';

alter table public.lead_alerts enable row level security;
alter table public.notification_outbox enable row level security;
drop policy if exists lead_alerts_read on public.lead_alerts;
drop policy if exists lead_alerts_write on public.lead_alerts;
drop policy if exists notification_outbox_read on public.notification_outbox;
create policy lead_alerts_read on public.lead_alerts for select using (public.member_level(workspace_id, 'comercial') >= 1);
create policy lead_alerts_write on public.lead_alerts for all using (public.member_level(workspace_id, 'comercial') >= 2)
  with check (public.member_level(workspace_id, 'comercial') >= 2);
create policy notification_outbox_read on public.notification_outbox for select using (public.member_level(workspace_id, 'comercial') >= 1);
revoke all on public.lead_alerts, public.notification_outbox from anon;
grant select, insert, update, delete on public.lead_alerts to authenticated;
grant select on public.notification_outbox to authenticated;

/** Card novo numa campanha com aviso ligado → um e-mail na fila (com contato e respostas do formulário). */
create or replace function public.queue_lead_alert() returns trigger
language plpgsql security definer set search_path = public as $$
declare a record; c public.contacts; pl public.pipelines; v_body text; v_resp text;
begin
  select * into pl from public.pipelines where id = new.pipeline_id;
  select * into c from public.contacts where id = new.contact_id;
  for a in select * from public.lead_alerts
            where workspace_id = new.workspace_id and active and cardinality(emails) > 0
              and (pipeline_id is null or pipeline_id = new.pipeline_id) loop
    select string_agg(coalesce(x->>'pergunta', x->>'q') || ': ' || coalesce(x->>'resposta', x->>'a'), E'\n') into v_resp
      from jsonb_array_elements(coalesce(case when jsonb_typeof(c.meta->'respostas') = 'array' then c.meta->'respostas' end,
                                         case when jsonb_typeof(c.meta->'answers') = 'array' then c.meta->'answers' end, '[]'::jsonb)) x;
    v_body := concat_ws(E'\n',
      'Novo lead em ' || coalesce(pl.name, 'campanha') || ':', '',
      'Nome: ' || coalesce(c.name, new.title),
      'WhatsApp/telefone: ' || coalesce(c.whatsapp, c.phone, '—'),
      'E-mail: ' || coalesce(c.email, '—'),
      'Temperatura: ' || coalesce(c.temperature, '—'),
      'Origem: ' || coalesce(c.source, '—'),
      case when v_resp is not null then E'\nRespostas do formulário:\n' || v_resp end);
    insert into public.notification_outbox (workspace_id, kind, to_emails, subject, body)
    values (new.workspace_id, 'lead_novo', a.emails,
            'Novo lead: ' || coalesce(c.name, new.title) || coalesce(' · ' || c.temperature, ''), v_body);
  end loop;
  return new;
end $$;
drop trigger if exists deals_queue_lead_alert on public.deals;
create trigger deals_queue_lead_alert after insert on public.deals for each row execute function public.queue_lead_alert();
revoke execute on function public.queue_lead_alert() from public, anon, authenticated;

/* ------------------------------ Leads do Meta ------------------------------ */
-- Qual formulário (ou página) do Meta cai em qual campanha. form_id '*' = qualquer formulário daquela página.
create table if not exists public.meta_lead_routes (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  page_id      text not null default '*',
  form_id      text not null default '*',
  pipeline_id  uuid not null references public.pipelines(id) on delete cascade,
  stage_id     uuid references public.pipeline_stages(id) on delete set null,
  source       text not null default 'Meta · Formulário instantâneo · {form_name}',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (page_id, form_id)
);
create table if not exists public.meta_lead_events (
  id          uuid primary key default gen_random_uuid(),
  leadgen_id  text,
  page_id     text,
  form_id     text,
  status      text not null default 'recebido',
  detail      jsonb,
  created_at  timestamptz not null default now()
);
alter table public.meta_lead_routes enable row level security;
alter table public.meta_lead_events enable row level security;
drop policy if exists meta_lead_routes_read on public.meta_lead_routes;
drop policy if exists meta_lead_routes_write on public.meta_lead_routes;
create policy meta_lead_routes_read on public.meta_lead_routes for select using (public.member_level(workspace_id, 'comercial') >= 1);
create policy meta_lead_routes_write on public.meta_lead_routes for all using (public.member_level(workspace_id, 'comercial') >= 2)
  with check (public.member_level(workspace_id, 'comercial') >= 2);
revoke all on public.meta_lead_routes, public.meta_lead_events from anon, authenticated;
grant select, insert, update, delete on public.meta_lead_routes to authenticated;

/* A importação passa a ter uma versão interna (sem login), usada pela função do Meta com a chave de serviço. */
do $$
declare src text;
begin
  select pg_get_functiondef('public.import_campaign_leads(uuid, uuid, jsonb)'::regprocedure) into src;
  src := replace(src, 'FUNCTION public.import_campaign_leads(', 'FUNCTION public.import_campaign_leads_core(');
  src := replace(src, 'if public.member_level(pl.workspace_id, ''comercial'') < 2 then raise exception ''Você não tem permissão de edição no Comercial deste espaço.''; end if;', '');
  execute src;
end $$;
revoke execute on function public.import_campaign_leads_core(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.import_campaign_leads_core(uuid, uuid, jsonb) to service_role;
