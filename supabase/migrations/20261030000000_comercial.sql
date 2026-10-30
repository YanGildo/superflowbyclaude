-- Fase 3 · Comercial
-- 1. Pipeline com as etapas do Superflow antigo (Onboarding e Cliente ativo depois de Fechado).
-- 2. Registro de contatos e conversões na tabela activities (categoria + campanha).
-- 3. Jornada do cliente (processos por momento).
-- 4. Conversas do WhatsApp (simulado agora; o real usa as mesmas tabelas depois).
-- 5. Segmentos de scripts com descrição, tipo de serviço e categorias.

-- 1 -------------------------------------------------------------------------
do $$
declare p record;
begin
  for p in select id, workspace_id from public.pipelines loop
    if not exists (select 1 from public.pipeline_stages where pipeline_id = p.id and name = 'Onboarding') then
      update public.pipeline_stages set position = 8 where pipeline_id = p.id and outcome = 'lost';
      insert into public.pipeline_stages (workspace_id, pipeline_id, name, position, outcome, set_contact_status) values
        (p.workspace_id, p.id, 'Onboarding',    6, 'won', 'cliente_ativo'),
        (p.workspace_id, p.id, 'Cliente ativo', 7, 'won', 'cliente_ativo');
    end if;
  end loop;
end $$;

-- 2 -------------------------------------------------------------------------
alter table public.activities
  add column category    text not null default 'contato' check (category in ('contato','conversao')),
  add column campaign_id uuid references public.campaigns(id) on delete set null,
  add column business_id uuid references public.businesses(id) on delete set null;
create index activities_ws_cat_idx on public.activities (workspace_id, category, at desc);

-- 3 -------------------------------------------------------------------------
create table public.journey_items (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id  uuid references public.businesses(id) on delete set null,
  contact_id   uuid references public.contacts(id) on delete cascade,
  moment       text not null check (moment in ('antes_fechar','onboarding','execucao','revisao')),
  title        text not null check (length(trim(title)) > 0),
  description  text,
  done         boolean not null default false,
  due_date     date,
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index journey_items_ws_idx on public.journey_items (workspace_id, moment, position);
create trigger journey_items_updated_at before update on public.journey_items
  for each row execute function public.set_updated_at();

-- 4 -------------------------------------------------------------------------
create table public.chat_threads (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  business_id     uuid references public.businesses(id) on delete set null,
  contact_id      uuid not null references public.contacts(id) on delete cascade,
  channel         text not null default 'whatsapp',
  mode            text not null default 'simulado' check (mode in ('simulado','real')),
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index chat_threads_ws_idx on public.chat_threads (workspace_id, last_message_at desc);

create table public.chat_messages (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  thread_id    uuid not null references public.chat_threads(id) on delete cascade,
  direction    text not null check (direction in ('in','out')),
  body         text not null,
  at           timestamptz not null default now()
);
create index chat_messages_thread_idx on public.chat_messages (thread_id, at);

create or replace function public.chat_touch_thread()
returns trigger language plpgsql set search_path = public as $$
begin
  update public.chat_threads set last_message_at = new.at where id = new.thread_id;
  return new;
end $$;
create trigger chat_messages_touch after insert on public.chat_messages
  for each row execute function public.chat_touch_thread();

-- 5 -------------------------------------------------------------------------
alter table public.script_segments
  add column description  text,
  add column service_type text,
  add column categories   text[] not null default '{}',
  add column is_default   boolean not null default false,
  add column archived_at  timestamptz;

create or replace function public.seed_script_segments(ws uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.script_segments where workspace_id = ws) then return; end if;
  insert into public.script_segments (workspace_id, name, description, service_type, is_default, position, categories) values
    (ws, 'Ensaio fotográfico com IA',
     'Atendimento, vendas, coleta de fotos, pagamento, produção, upsell e pós-venda de ensaios fotográficos com IA do RG Studio.',
     'Ensaios com IA', true, 0,
     array['Abordagem inicial','Qualificação','Pacotes e proposta','Fechamento','Coleta de fotos','Pagamento','Produção','Upsell','Objeções','Follow-up','Pós-venda','Depoimentos / indicação']),
    (ws, 'Edição de fotos',
     'Atendimento e venda de edição, restauração, melhoria, troca de fundo, composição e ajustes em fotos.',
     'Edição de fotos', false, 1,
     array['Abordagem inicial','Qualificação','Pacotes e proposta','Fechamento','Pagamento','Produção','Entrega','Objeções','Follow-up','Pós-venda']),
    (ws, 'Agência — Brasileiros na gringa',
     'Prospecção e atendimento de brasileiros no exterior que precisam de site, landing page, tráfego, criativos, automações ou presença digital.',
     'Agência digital', false, 2,
     array['Prospecção','Abordagem inicial','Diagnóstico','Reunião','Proposta','Follow-up','Fechamento','Onboarding','Relatório','Pós-venda','Upsell']),
    (ws, 'Agência — Brasil',
     'Atendimento de negócios locais, empresas e prestadores de serviço no Brasil.',
     'Agência digital', false, 3,
     array['Prospecção','Abordagem inicial','Diagnóstico','Reunião','Proposta','Follow-up','Fechamento','Onboarding','Relatório','Pós-venda','Upsell']);
end $$;
revoke execute on function public.seed_script_segments(uuid) from public, anon, authenticated;

-- Workspaces que já existem também ganham os segmentos.
do $$
declare w record;
begin
  for w in select id from public.workspaces loop perform public.seed_script_segments(w.id); end loop;
end $$;

-- RLS nas tabelas novas (mesmo padrão do schema inicial).
do $$
declare t text;
begin
  foreach t in array array['journey_items','chat_threads','chat_messages'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select using (public.is_member(workspace_id))', t || '_read', t);
    execute format('create policy %I on public.%I for insert with check (public.can_write(workspace_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update using (public.can_write(workspace_id)) with check (public.can_write(workspace_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete using (public.can_write(workspace_id))', t || '_delete', t);
  end loop;
end $$;

-- Onboarding de contas novas: etapas novas do pipeline + segmentos de scripts.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare ws uuid; pl uuid; f text; i int := 0; inv record; invited boolean := false;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));

  for inv in select * from public.workspace_invites where email = lower(new.email) and accepted_at is null loop
    insert into public.workspace_members (workspace_id, user_id, role) values (inv.workspace_id, new.id, inv.role)
    on conflict do nothing;
    update public.workspace_invites set accepted_at = now() where id = inv.id;
    invited := true;
  end loop;
  if invited then return new; end if;

  insert into public.workspaces (name, owner_id) values ('Superflow', new.id) returning id into ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws, new.id, 'owner');

  insert into public.businesses (workspace_id, name, kind, color, position) values (ws, 'Pessoal', 'pessoal', '#7c3aed', 0);

  foreach f in array array['Hoje','Semana','Copies','Gravações','Edições','Criativos','Campanhas','Clientes','Estudos','Pessoal','Financeiro'] loop
    insert into public.work_flows (workspace_id, name, position, is_system)
    values (ws, f, i, f in ('Hoje','Semana'));
    i := i + 1;
  end loop;

  insert into public.task_lists (workspace_id, name, position) values (ws, 'Tarefas', 0);

  insert into public.pipelines (workspace_id, name) values (ws, 'Comercial') returning id into pl;
  insert into public.pipeline_stages (workspace_id, pipeline_id, name, position, outcome, set_contact_status) values
    (ws, pl, 'Novo lead',        0, 'open', 'lead'),
    (ws, pl, 'Diagnóstico',      1, 'open', null),
    (ws, pl, 'Reunião marcada',  2, 'open', null),
    (ws, pl, 'Proposta enviada', 3, 'open', 'em_negociacao'),
    (ws, pl, 'Em negociação',    4, 'open', 'em_negociacao'),
    (ws, pl, 'Fechado',          5, 'won',  'cliente_ativo'),
    (ws, pl, 'Onboarding',       6, 'won',  'cliente_ativo'),
    (ws, pl, 'Cliente ativo',    7, 'won',  'cliente_ativo'),
    (ws, pl, 'Perdido',          8, 'lost', 'perdido');

  insert into public.fin_categories (workspace_id, name, kind, essential) values
    (ws, 'Vendas', 'entrada', false), (ws, 'Serviços', 'entrada', false), (ws, 'Salário / Pró-labore', 'entrada', false),
    (ws, 'Moradia', 'saida', true), (ws, 'Alimentação', 'saida', true), (ws, 'Transporte', 'saida', true),
    (ws, 'Saúde', 'saida', true), (ws, 'Ferramentas / SaaS', 'saida', false), (ws, 'Tráfego pago', 'saida', false),
    (ws, 'Taxas de gateway', 'saida', false), (ws, 'Lazer', 'saida', false), (ws, 'Impostos', 'saida', true);

  perform public.seed_script_segments(ws);

  insert into public.services (workspace_id, name, recurring) values
    (ws, 'Gestão de tráfego', true), (ws, 'Social media', true), (ws, 'Edição de vídeo', true),
    (ws, 'Design', true), (ws, 'Copywriting', true), (ws, 'Landing page', false),
    (ws, 'Site institucional', false), (ws, 'Identidade visual', false), (ws, 'Consultoria', false),
    (ws, 'Funil de vendas', false), (ws, 'Automação', false), (ws, 'CRM', false);

  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
