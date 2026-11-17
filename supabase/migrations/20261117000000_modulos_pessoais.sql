-- Módulos pessoais: TikTok Shop (criador/afiliado), Veículos (manutenções e gastos) e Treino (avaliações, treinos e dieta).
-- Tudo por workspace, com permissão própria "pessoal".

/* ------------------------------ TikTok Shop ------------------------------ */
create table if not exists public.tts_settings (
  workspace_id        uuid primary key references public.workspaces(id) on delete cascade,
  month_goal          numeric(14,2) not null default 3000,  -- meta de comissão no mês (R$)
  avg_commission_pct  numeric(5,2)  not null default 15,
  avg_price           numeric(14,2) not null default 80,
  orders_per_video    numeric(8,2)  not null default 0.5,   -- vendas médias por vídeo (estimativa até ter dados)
  videos_per_day_goal int           not null default 3,
  lives_per_week_goal int           not null default 2,
  updated_at          timestamptz   not null default now()
);

create table if not exists public.tts_products (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  name           text not null check (length(trim(name)) > 0),
  link           text,
  category       text,
  price          numeric(14,2),
  commission_pct numeric(5,2),
  sample_status  text not null default 'sem_amostra' check (sample_status in ('quero', 'solicitada', 'a_caminho', 'recebida', 'sem_amostra')),
  status         text not null default 'testando' check (status in ('ideia', 'testando', 'vencedor', 'pausado', 'descartado')),
  notes          text,
  created_at     timestamptz not null default now()
);

create table if not exists public.tts_videos (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id   uuid references public.tts_products(id) on delete set null,
  title        text not null check (length(trim(title)) > 0),
  status       text not null default 'ideia' check (status in ('ideia', 'roteiro', 'gravado', 'editado', 'postado')),
  planned_for  date,
  posted_on    date,
  link         text,
  views        int not null default 0,
  clicks       int not null default 0,
  orders       int not null default 0,
  gmv          numeric(14,2) not null default 0,
  commission   numeric(14,2) not null default 0,
  notes        text,
  created_at   timestamptz not null default now()
);

create table if not exists public.tts_days (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  day           date not null,
  videos_posted int not null default 0,
  lives         int not null default 0,
  live_minutes  int not null default 0,
  orders        int not null default 0,
  gmv           numeric(14,2) not null default 0,
  commission    numeric(14,2) not null default 0,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (workspace_id, day)
);

/* ------------------------------ Veículos ------------------------------ */
create table if not exists public.vehicles (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null check (length(trim(name)) > 0),
  plate        text,
  brand        text,
  model        text,
  year         int,
  color        text,
  current_km   int,
  notes        text,
  archived_at  timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.vehicle_services (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  vehicle_id     uuid not null references public.vehicles(id) on delete cascade,
  date           date not null default current_date,
  km             int,
  category       text not null default 'manutencao'
                 check (category in ('manutencao', 'revisao', 'pneus', 'combustivel', 'documentacao', 'seguro', 'lavagem', 'multa', 'outros')),
  shop           text,
  shop_phone     text,
  os_number      text,
  items          jsonb not null default '[]'::jsonb,   -- [{ desc, qty, unit, discount }]
  total          numeric(14,2) not null default 0,
  notes          text,
  next_date      date,
  next_km        int,
  to_finance     boolean not null default true,
  created_at     timestamptz not null default now()
);
create index if not exists vehicle_services_vehicle on public.vehicle_services (vehicle_id, date desc);

/** Gasto do veículo vira saída no Financeiro (uma por registro, atualiza junto, some se apagar). */
create or replace function public.vehicle_service_to_finance() returns trigger
language plpgsql security definer set search_path = public as $$
declare cat uuid; v public.vehicles; label text;
begin
  if tg_op = 'DELETE' then
    delete from public.transactions where source_type = 'vehicle_service' and source_id = old.id;
    return old;
  end if;
  if not new.to_finance or coalesce(new.total, 0) <= 0 then
    delete from public.transactions where source_type = 'vehicle_service' and source_id = new.id;
    return new;
  end if;
  -- Só lança no Financeiro quem pode editar o Financeiro deste espaço.
  if public.member_level(new.workspace_id, 'financeiro') < 2 then return new; end if;
  select * into v from public.vehicles where id = new.vehicle_id;
  insert into public.fin_categories (workspace_id, name, kind) values (new.workspace_id, 'Veículo', 'saida')
    on conflict (workspace_id, name, kind) do nothing;
  select id into cat from public.fin_categories where workspace_id = new.workspace_id and name = 'Veículo' and kind = 'saida';
  label := coalesce(v.name, 'Veículo') || ' · ' || coalesce(nullif(new.shop, ''), initcap(replace(new.category, '_', ' ')))
           || coalesce(' · ' || nullif(new.os_number, ''), '');
  insert into public.transactions (workspace_id, type, amount, date, description, category_id, status, use_type, source_type, source_id, notes)
  values (new.workspace_id, 'saida', new.total, new.date, left(label, 200), cat, 'pago', 'pessoal', 'vehicle_service', new.id, 'Lançado pelo módulo Veículos')
  on conflict (source_type, source_id) do update
    set amount = excluded.amount, date = excluded.date, description = excluded.description, deleted_at = null, updated_at = now();
  return new;
end $$;
drop trigger if exists vehicle_services_finance on public.vehicle_services;
create trigger vehicle_services_finance after insert or update or delete on public.vehicle_services
  for each row execute function public.vehicle_service_to_finance();
revoke execute on function public.vehicle_service_to_finance() from public, anon, authenticated;

/* ------------------------------ Treino ------------------------------ */
create table if not exists public.body_assessments (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  date          date not null default current_date,
  evaluator     text,
  place         text,
  age           int,
  sex           text check (sex in ('M', 'F')),
  weight        numeric(6,2),
  height        numeric(4,2),
  protocol      text,
  fat_pct       numeric(5,2),   -- dobras cutâneas
  fat_kg        numeric(6,2),
  lean_kg       numeric(6,2),
  muscle_kg     numeric(6,2),
  residual_kg   numeric(6,2),
  bone_kg       numeric(6,2),
  bio_fat_pct   numeric(5,2),   -- bioimpedância
  bio_muscle_pct numeric(5,2),
  skinfolds     jsonb not null default '{}'::jsonb,       -- { peitoral, axilar_media, triceps, subescapular, abdominal, suprailiaca, coxa, ... } em mm
  circumferences jsonb not null default '{}'::jsonb,      -- { torax, cintura, abdomen, quadril, braco_d_contraido, ... } em cm
  goal          text,
  anamnese      text,
  notes         text,
  next_date     date,
  created_at    timestamptz not null default now()
);
create index if not exists body_assessments_ws on public.body_assessments (workspace_id, date desc);

create table if not exists public.workout_plans (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null check (length(trim(name)) > 0),
  focus        text,
  exercises    jsonb not null default '[]'::jsonb,   -- [{ name, sets, reps, load, rest, notes }]
  position     int not null default 0,
  archived_at  timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.workout_logs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  date         date not null default current_date,
  plan_id      uuid references public.workout_plans(id) on delete set null,
  kind         text not null default 'musculacao' check (kind in ('musculacao', 'cardio', 'luta', 'funcional', 'outro')),
  duration_min int,
  effort       int check (effort between 1 and 10),
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists workout_logs_ws on public.workout_logs (workspace_id, date desc);

create table if not exists public.fitness_settings (
  workspace_id     uuid primary key references public.workspaces(id) on delete cascade,
  goal             text,
  target_fat_pct   numeric(5,2),
  target_weight    numeric(6,2),
  workouts_per_week int not null default 4,
  kcal             int,
  protein_g        int,
  carbs_g          int,
  fat_g            int,
  water_l          numeric(4,1),
  meals            jsonb not null default '[]'::jsonb,   -- [{ time, name, items }]
  updated_at       timestamptz not null default now()
);

create table if not exists public.diet_logs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  date         date not null default current_date,
  followed     text not null default 'sim' check (followed in ('sim', 'parcial', 'nao')),
  water_l      numeric(4,1),
  kcal         int,
  protein_g    int,
  notes        text,
  created_at   timestamptz not null default now(),
  unique (workspace_id, date)
);

/* ------------------------------ Permissão "pessoal" ------------------------------ */
create or replace function public.module_of(_t text) returns text
language sql immutable set search_path = public as $$
  select case
    when _t in ('tasks', 'task_lists', 'task_steps', 'work_flows') then 'tarefas'
    when _t in ('projects') then 'projetos'
    when _t in ('goals', 'goal_steps') then 'metas'
    when _t in ('funnels') then 'funis'
    when _t like 'action_plan%' then 'planos'
    when _t in ('contacts', 'deals', 'pipelines', 'pipeline_stages', 'activities', 'proposals', 'proposal_items',
                'services', 'journey_items', 'chat_threads', 'chat_messages') then 'comercial'
    when _t in ('prospects', 'prospect_searches', 'prospect_campaigns', 'prospect_niches') then 'prospeccao'
    when _t in ('scripts', 'script_segments') then 'scripts'
    when _t in ('marketing_plans', 'campaigns', 'content_items', 'deliveries', 'hooks', 'content_stories', 'client_questions',
                'recordings', 'reference_accounts', 'reference_posts', 'content_metrics', 'trend_items', 'content_settings') then 'marketing'
    when _t in ('credit_cards', 'debts', 'fin_accounts', 'fin_assets', 'fin_categories', 'fin_goals',
                'net_worth_snapshots', 'payable_payments', 'payables', 'receivables', 'reserves', 'transactions') then 'financeiro'
    when _t in ('appointments', 'assistant_digests', 'assistant_drafts') then 'central'
    when _t in ('bot_events', 'bot_flows', 'bot_leads', 'bot_messages', 'bot_sessions', 'bots', 'gateways', 'offers',
                'payments', 'remarketing_campaigns', 'remarketing_sends', 'sales', 'subscriptions', 'tracking_links',
                'vip_groups') then 'telegram'
    when _t in ('tts_settings', 'tts_products', 'tts_videos', 'tts_days', 'vehicles', 'vehicle_services',
                'body_assessments', 'workout_plans', 'workout_logs', 'fitness_settings', 'diet_logs') then 'pessoal'
    else 'equipe' end $$;

do $$
declare t text;
begin
  foreach t in array array['tts_settings', 'tts_products', 'tts_videos', 'tts_days', 'vehicles', 'vehicle_services',
                           'body_assessments', 'workout_plans', 'workout_logs', 'fitness_settings', 'diet_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for select using (public.member_level(workspace_id, ''pessoal'') >= 1)', t || '_read', t);
    execute format('create policy %I on public.%I for insert with check (public.member_level(workspace_id, ''pessoal'') >= 2)', t || '_insert', t);
    execute format('create policy %I on public.%I for update using (public.member_level(workspace_id, ''pessoal'') >= 2) with check (public.member_level(workspace_id, ''pessoal'') >= 2)', t || '_update', t);
    execute format('create policy %I on public.%I for delete using (public.member_level(workspace_id, ''pessoal'') >= 2)', t || '_delete', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
