-- Módulo Conteúdo (Social Media): calendário, produção, ganchos, pautas/histórias,
-- referências, análise e em alta. Estende content_items (mesmo registro no Calendário e na Produção).

-- Etapa "agendado" entre aprovado e publicado.
alter table public.content_items drop constraint if exists content_items_stage_check;
alter table public.content_items add constraint content_items_stage_check
  check (stage in ('ideia','roteiro','gravacao','edicao','revisao','aprovado','agendado','publicado','pausado'));

alter table public.content_items add column if not exists pillar text;
alter table public.content_items add column if not exists hook text;
alter table public.content_items add column if not exists hook_formula_id int;
alter table public.content_items add column if not exists cta text;
alter table public.content_items add column if not exists art_url text;
alter table public.content_items add column if not exists video_url text;
alter table public.content_items add column if not exists recording_id uuid;
alter table public.content_items add column if not exists checklist jsonb not null default '{}'::jsonb;
alter table public.content_items add column if not exists metrics jsonb not null default '{}'::jsonb;

-- As 26 fórmulas de gancho (iguais para todo mundo).
create table if not exists public.hook_formulas (
  id int primary key,
  name text not null,
  template text not null
);
alter table public.hook_formulas enable row level security;
drop policy if exists hook_formulas_read on public.hook_formulas;
create policy hook_formulas_read on public.hook_formulas for select to authenticated using (true);
grant select on public.hook_formulas to authenticated;

insert into public.hook_formulas (id, name, template) values
 (1, 'Quanto o erro custou', '[Valor exato] foi o que [um erro] me custou.'),
 (2, 'Para de fazer isso', 'Para de [hábito]. Faz [alternativa] no lugar.'),
 (3, 'Ninguém te conta', 'Ninguém te conta que [verdade incômoda].'),
 (4, 'A substituição', '[Essa coisa] substituiu [coisa cara] por [preço].'),
 (5, 'O tempo que encolheu', 'Isso me levava [tempo longo]. Agora leva [tempo curto].'),
 (6, 'O recibo', 'Eu [fiz tal coisa] por [N dias]. Aqui estão os números de verdade.'),
 (7, 'Jeito errado, jeito certo', 'Você está fazendo [coisa] errado, e a culpa não é sua.'),
 (8, 'Quem viu de dentro', 'Passei [N anos] [dentro da coisa]. Aqui está o que a gente nunca falava.'),
 (9, 'Rouba isso', 'Rouba esse [material]. Levei [tempo] pra acertar.'),
 (10, 'Se é o seu caso', 'Se você [situação], esses [tempo] resolvem.'),
 (11, 'Lista com favorito', '[N] [coisas] que [resultado]. A número [k] é a que ninguém usa.'),
 (12, 'A objeção', '''[Objeção real].'' Tudo bem. Aqui está a versão que funciona mesmo assim.'),
 (13, 'Antes e depois na tela', '[Antigo], [novo] e a única alavanca que mudou.'),
 (14, 'Recado pra um grupo', '[Grupo específico], esse é o que você vem ignorando.'),
 (15, 'Os flops antes do acerto', 'Meus primeiros [N] não deram em nada. O que mudou no [N+1].'),
 (16, 'A pergunta do jeito que chegou', '''[Pergunta exata]'', eu recebo essa toda semana.'),
 (17, 'Um contra o outro', '[A] contra [B]. Rodei os dois por [tempo].'),
 (18, 'Demonstração sem introdução', '[Já fazendo.] Olha o que isso faz.'),
 (19, 'O prazo', '[Coisa] muda em [data]. Faz [ação] antes.'),
 (20, 'Você não precisa', 'Você não precisa de [coisa que todo mundo diz].'),
 (21, 'Começo no meio da frase', '...e foi aí que [a virada].'),
 (22, 'O ditado ao contrário', '[Ditado conhecido invertido.]'),
 (23, 'A estatística', '[N]% de [grupo] [fato surpreendente].'),
 (24, 'O novo', 'Esse é o novo [coisa].'),
 (25, 'O resultado de outra pessoa', 'Teve um [pessoa] que [resultado] em [tempo].'),
 (26, 'O jeito mais rápido', 'O jeito mais [rápido/barato] de [coisa] é [resposta].')
on conflict (id) do update set name = excluded.name, template = excluded.template;

create table if not exists public.hooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  text text not null,
  template text,
  formula_id int references public.hook_formulas(id),
  niche text,
  kind text,
  views int,
  source text,
  link text,
  score int,
  verdict text,
  weakest text,
  created_at timestamptz not null default now()
);

create table if not exists public.content_stories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  title text not null,
  happened_on date,
  body text,
  number text,
  result text,
  tags text[] not null default '{}',
  used_item_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.client_questions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  text text not null,
  asked_on date not null default current_date,
  origin text,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  title text not null,
  recorded_on date,
  topics jsonb not null default '[]'::jsonb,
  audio_url text,
  transcript text,
  status text not null default 'pauta' check (status in ('pauta','gravado','transcrito','mapa','pecas')),
  created_at timestamptz not null default now()
);
alter table public.content_items drop constraint if exists content_items_recording_fk;
alter table public.content_items add constraint content_items_recording_fk foreign key (recording_id) references public.recordings(id) on delete set null;
alter table public.content_items drop constraint if exists content_items_hook_formula_fk;
alter table public.content_items add constraint content_items_hook_formula_fk foreign key (hook_formula_id) references public.hook_formulas(id);

create table if not exists public.reference_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  handle text not null,
  followers int,
  median_views int,
  grp text not null default 'diretas' check (grp in ('diretas','vizinhas','grandes')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.reference_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null references public.reference_accounts(id) on delete cascade,
  views int,
  hook text,
  format text,
  link text,
  posted_on date,
  created_at timestamptz not null default now()
);

create table if not exists public.content_metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  item_id uuid not null references public.content_items(id) on delete cascade,
  measured_on date not null default current_date,
  views int, reach int, non_follower_pct numeric, retention3s numeric,
  saves int, shares int, comments int, follows int, dms int,
  note text,
  created_at timestamptz not null default now(),
  unique (item_id, measured_on)
);

create table if not exists public.trend_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  link text,
  source text,
  summary text not null,
  tag text not null default 'potencial' check (tag in ('potencial','explicar','pular')),
  found_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.content_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  frequency text,
  platforms text,
  persona text,
  updated_at timestamptz not null default now()
);

-- Módulo de permissão: tudo isso é "marketing".
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
    else 'equipe' end $$;

do $$
declare t text;
begin
  foreach t in array array['hooks', 'content_stories', 'client_questions', 'recordings', 'reference_accounts',
                           'reference_posts', 'content_metrics', 'trend_items', 'content_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for select using (public.member_level(workspace_id, ''marketing'') >= 1)', t || '_read', t);
    execute format('create policy %I on public.%I for insert with check (public.member_level(workspace_id, ''marketing'') >= 2)', t || '_insert', t);
    execute format('create policy %I on public.%I for update using (public.member_level(workspace_id, ''marketing'') >= 2) with check (public.member_level(workspace_id, ''marketing'') >= 2)', t || '_update', t);
    execute format('create policy %I on public.%I for delete using (public.member_level(workspace_id, ''marketing'') >= 2)', t || '_delete', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

create index if not exists hooks_ws on public.hooks (workspace_id, created_at desc);
create index if not exists content_metrics_ws on public.content_metrics (workspace_id, measured_on desc);
create index if not exists reference_posts_ws on public.reference_posts (workspace_id, account_id);
