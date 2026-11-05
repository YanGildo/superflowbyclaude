-- Equipes, contas independentes e permissões granulares.
--
-- Modelo:
--   * Cada conta tem o próprio workspace "pessoal" (privado; só o dono é membro).
--   * Espaços de equipe são workspaces kind='equipe'. Só neles dá para convidar.
--   * Permissão por módulo em workspace_members.permissions: {"tarefas":"edit", ...}
--     níveis: none < view < edit < manage. Dono e admin = manage em tudo. Padrão = none.
--   * Permissão por item (tarefa, projeto, script, prospect, plano):
--       resource_grants: libera um item para alguém (mesmo sem acesso ao módulo).
--       restricted_resources: item restrito = só quem tem grant (e quem gerencia o módulo).
--   * Tudo é aplicado aqui no banco (RLS + RPCs security definer). Nada é apagado.

-- ───────────────────────── estrutura ─────────────────────────
alter table public.workspaces add column if not exists kind text not null default 'pessoal'
  check (kind in ('pessoal', 'equipe'));
alter table public.workspaces add column if not exists created_at timestamptz not null default now();

alter table public.workspace_members add column if not exists permissions jsonb not null default '{}'::jsonb;

alter table public.workspace_invites alter column email drop not null;
alter table public.workspace_invites add column if not exists token text unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
alter table public.workspace_invites add column if not exists permissions jsonb not null default '{}'::jsonb;
alter table public.workspace_invites add column if not exists expires_at timestamptz not null default now() + interval '14 days';
alter table public.workspace_invites add column if not exists accepted_by uuid references auth.users(id) on delete set null;
update public.workspace_invites set token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') where token is null;

create table if not exists public.resource_grants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  resource_type text not null check (resource_type in ('tasks', 'projects', 'scripts', 'prospects', 'action_plans')),
  resource_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null check (level in ('view', 'edit', 'manage')),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (resource_type, resource_id, user_id)
);
create index if not exists resource_grants_user on public.resource_grants (user_id, workspace_id);

create table if not exists public.restricted_resources (
  resource_type text not null check (resource_type in ('tasks', 'projects', 'scripts', 'prospects', 'action_plans')),
  resource_id uuid not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  restricted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (resource_type, resource_id)
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  module text not null,
  entity_type text not null,
  entity_id uuid,
  resource_type text,
  resource_id uuid,
  title text,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_ws on public.activity_log (workspace_id, created_at desc);

-- Nome de quem fez (continua aparecendo mesmo depois que a pessoa sai da equipe).
create or replace function public.current_actor_name() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(p.full_name, u.email) from auth.users u left join public.profiles p on p.id = u.id where u.id = auth.uid() $$;
alter table public.activity_log add column if not exists actor_name text default public.current_actor_name();

-- ───────────────────────── níveis ─────────────────────────
create or replace function public.level_num(_l text) returns int
language sql immutable set search_path = public as $$
  select case _l when 'manage' then 3 when 'edit' then 2 when 'view' then 1 else 0 end $$;

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
    when _t in ('marketing_plans', 'campaigns', 'content_items', 'deliveries') then 'marketing'
    when _t in ('credit_cards', 'debts', 'fin_accounts', 'fin_assets', 'fin_categories', 'fin_goals',
                'net_worth_snapshots', 'payable_payments', 'payables', 'receivables', 'reserves', 'transactions') then 'financeiro'
    when _t in ('appointments', 'assistant_digests', 'assistant_drafts') then 'central'
    when _t in ('bot_events', 'bot_flows', 'bot_leads', 'bot_messages', 'bot_sessions', 'bots', 'gateways', 'offers',
                'payments', 'remarketing_campaigns', 'remarketing_sends', 'sales', 'subscriptions', 'tracking_links',
                'vip_groups') then 'telegram'
    else 'equipe' end $$;

/** Nível da pessoa logada num módulo do workspace (0 = sem acesso). */
create or replace function public.member_level(_ws uuid, _module text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when m.role in ('owner', 'admin') then 3
      when m.role = 'viewer' then least(1, public.level_num(m.permissions->>_module))
      else public.level_num(m.permissions->>_module) end
    from public.workspace_members m
    where m.workspace_id = _ws and m.user_id = auth.uid()), 0) $$;

create or replace function public.is_manager(_ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members m
                 where m.workspace_id = _ws and m.user_id = auth.uid() and m.role in ('owner', 'admin')) $$;

-- "Pode escrever" passa a ser só dono/admin (tabelas sem módulo próprio, ex.: negócios).
create or replace function public.can_write(_ws uuid) returns boolean
language sql stable security definer set search_path = public as $$ select public.is_manager(_ws) $$;

create or replace function public.resource_module(_type text) returns text
language sql immutable set search_path = public as $$
  select case _type when 'tasks' then 'tarefas' when 'projects' then 'projetos' when 'scripts' then 'scripts'
                    when 'prospects' then 'prospeccao' when 'action_plans' then 'planos' end $$;

/** Nível da pessoa logada num item: módulo + liberação do item; item restrito = só liberação. */
create or replace function public.resource_level(_type text, _id uuid, _ws uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare m int; g int;
begin
  m := public.member_level(_ws, public.resource_module(_type));
  if m = 3 then return 3; end if;
  if not exists (select 1 from public.workspace_members where workspace_id = _ws and user_id = auth.uid()) then return 0; end if;
  select coalesce(max(public.level_num(level)), 0) into g from public.resource_grants
   where resource_type = _type and resource_id = _id and user_id = auth.uid() and workspace_id = _ws;
  if exists (select 1 from public.restricted_resources where resource_type = _type and resource_id = _id) then return g; end if;
  return greatest(m, g);
end $$;

/** Tarefa de projeto herda o acesso do projeto (além do módulo Tarefas, se o projeto não for restrito). */
create or replace function public.task_level(_id uuid, _ws uuid, _project uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare m int; g int; p int;
begin
  if _project is null then return public.resource_level('tasks', _id, _ws); end if;
  m := public.member_level(_ws, 'tarefas');
  if m = 3 then return 3; end if;
  if not exists (select 1 from public.workspace_members where workspace_id = _ws and user_id = auth.uid()) then return 0; end if;
  select coalesce(max(public.level_num(level)), 0) into g from public.resource_grants
   where resource_type = 'tasks' and resource_id = _id and user_id = auth.uid() and workspace_id = _ws;
  if exists (select 1 from public.restricted_resources where resource_type = 'tasks' and resource_id = _id) then return g; end if;
  p := public.resource_level('projects', _project, _ws);
  if exists (select 1 from public.restricted_resources where resource_type = 'projects' and resource_id = _project) then
    return greatest(p, g);
  end if;
  return greatest(p, m, g);
end $$;

-- ───────────────────────── RLS por módulo ─────────────────────────
do $$
declare t text; mod text;
begin
  foreach t in array array[
    'task_lists', 'work_flows', 'goals', 'goal_steps', 'funnels',
    'contacts', 'deals', 'pipelines', 'pipeline_stages', 'activities', 'proposals', 'proposal_items', 'services',
    'journey_items', 'chat_threads', 'chat_messages',
    'prospect_searches', 'prospect_campaigns', 'script_segments',
    'marketing_plans', 'campaigns', 'content_items', 'deliveries',
    'credit_cards', 'debts', 'fin_accounts', 'fin_assets', 'fin_categories', 'fin_goals', 'net_worth_snapshots',
    'payable_payments', 'payables', 'receivables', 'reserves', 'transactions',
    'appointments', 'assistant_digests', 'assistant_drafts',
    'bot_events', 'bot_flows', 'bot_leads', 'bot_messages', 'bot_sessions', 'bots', 'gateways', 'offers', 'payments',
    'remarketing_campaigns', 'remarketing_sends', 'sales', 'subscriptions', 'tracking_links', 'vip_groups']
  loop
    if to_regclass('public.' || t) is null then continue; end if;
    mod := public.module_of(t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for select using (public.member_level(workspace_id, %L) >= 1)', t || '_read', t, mod);
    execute format('create policy %I on public.%I for insert with check (public.member_level(workspace_id, %L) >= 2)', t || '_insert', t, mod);
    execute format('create policy %I on public.%I for update using (public.member_level(workspace_id, %L) >= 2) with check (public.member_level(workspace_id, %L) >= 2)', t || '_update', t, mod, mod);
    execute format('create policy %I on public.%I for delete using (public.member_level(workspace_id, %L) >= 2)', t || '_delete', t, mod);
  end loop;
end $$;

-- Itens compartilháveis: módulo + liberação/restrição por item.
do $$
declare t text; expr text;
begin
  foreach t in array array['projects', 'scripts', 'prospects', 'action_plans', 'tasks'] loop
    expr := case when t = 'tasks' then 'public.task_level(id, workspace_id, project_id)'
                 else format('public.resource_level(%L, id, workspace_id)', t) end;
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for select using (%s >= 1)', t || '_read', t, expr);
    execute format('create policy %I on public.%I for insert with check (%s >= 2)', t || '_insert', t, expr);
    execute format('create policy %I on public.%I for update using (%s >= 2) with check (%s >= 2)', t || '_update', t, expr, expr);
    execute format('create policy %I on public.%I for delete using (%s >= 2)', t || '_delete', t, expr);
  end loop;
end $$;

-- Filhos: seguem o item pai (etapas da tarefa; etapas/scripts/números do plano).
drop policy if exists task_steps_read on public.task_steps;
drop policy if exists task_steps_insert on public.task_steps;
drop policy if exists task_steps_update on public.task_steps;
drop policy if exists task_steps_delete on public.task_steps;
create or replace function public.task_step_level(_task uuid, _ws uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select public.task_level(t.id, t.workspace_id, t.project_id) from public.tasks t
                   where t.id = _task and t.workspace_id = _ws), 0) $$;
create policy task_steps_read on public.task_steps for select using (public.task_step_level(task_id, workspace_id) >= 1);
create policy task_steps_insert on public.task_steps for insert with check (public.task_step_level(task_id, workspace_id) >= 2);
create policy task_steps_update on public.task_steps for update using (public.task_step_level(task_id, workspace_id) >= 2) with check (public.task_step_level(task_id, workspace_id) >= 2);
create policy task_steps_delete on public.task_steps for delete using (public.task_step_level(task_id, workspace_id) >= 2);

do $$
declare t text;
begin
  foreach t in array array['action_plan_steps', 'action_plan_assets', 'action_plan_checkins'] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format($p$create policy %I on public.%I for select using (exists (select 1 from public.action_plans p where p.id = plan_id and p.workspace_id = %I.workspace_id and public.resource_level('action_plans', p.id, p.workspace_id) >= 1))$p$, t || '_read', t, t);
    execute format($p$create policy %I on public.%I for insert with check (exists (select 1 from public.action_plans p where p.id = plan_id and p.workspace_id = %I.workspace_id and public.resource_level('action_plans', p.id, p.workspace_id) >= 2))$p$, t || '_insert', t, t);
    execute format($p$create policy %I on public.%I for update using (exists (select 1 from public.action_plans p where p.id = plan_id and p.workspace_id = %I.workspace_id and public.resource_level('action_plans', p.id, p.workspace_id) >= 2)) with check (exists (select 1 from public.action_plans p where p.id = plan_id and p.workspace_id = %I.workspace_id and public.resource_level('action_plans', p.id, p.workspace_id) >= 2))$p$, t || '_update', t, t, t);
    execute format($p$create policy %I on public.%I for delete using (exists (select 1 from public.action_plans p where p.id = plan_id and p.workspace_id = %I.workspace_id and public.resource_level('action_plans', p.id, p.workspace_id) >= 2))$p$, t || '_delete', t, t);
  end loop;
end $$;

drop policy if exists niches_read on public.prospect_niches;
drop policy if exists niches_write on public.prospect_niches;
create policy niches_read on public.prospect_niches for select using (workspace_id is null or public.member_level(workspace_id, 'prospeccao') >= 1);
create policy niches_write on public.prospect_niches for all
  using (workspace_id is not null and public.member_level(workspace_id, 'prospeccao') >= 2)
  with check (workspace_id is not null and public.member_level(workspace_id, 'prospeccao') >= 2);

-- Convites: só dono/admin enxergam (o token dá acesso).
drop policy if exists invites_read on public.workspace_invites;
drop policy if exists invites_owner on public.workspace_invites;
create policy invites_read on public.workspace_invites for select using (public.is_manager(workspace_id));
create policy invites_delete on public.workspace_invites for delete using (public.is_manager(workspace_id));

alter table public.resource_grants enable row level security;
alter table public.restricted_resources enable row level security;
alter table public.activity_log enable row level security;
create policy grants_read on public.resource_grants for select
  using (user_id = auth.uid() or public.resource_level(resource_type, resource_id, workspace_id) >= 3);
create policy restricted_read on public.restricted_resources for select
  using (exists (select 1 from public.workspace_members m where m.workspace_id = restricted_resources.workspace_id and m.user_id = auth.uid()));

create or replace function public.can_view_activity(_ws uuid, _module text, _rtype text, _rid uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare p uuid;
begin
  if _rtype = 'tasks' then
    select project_id into p from public.tasks where id = _rid;
    if found then return public.task_level(_rid, _ws, p) >= 1; end if;
  end if;
  if _rtype is not null then return public.resource_level(_rtype, _rid, _ws) >= 1; end if;
  if _module = 'equipe' then return exists (select 1 from public.workspace_members where workspace_id = _ws and user_id = auth.uid()); end if;
  return public.member_level(_ws, _module) >= 1;
end $$;
create policy activity_read on public.activity_log for select
  using (public.can_view_activity(workspace_id, module, resource_type, resource_id));

-- O gatilho de aprovação de proposta gera contas a receber: roda como sistema
-- (a proposta já passou pela RLS) para quem só tem o módulo Comercial.
alter function public.proposals_on_approve() security definer;

-- ───────────────────────── histórico de atividade ─────────────────────────
create or replace function public.log_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb; ws uuid; act text; rtype text; rid uuid; t text := tg_table_name;
begin
  r := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  ws := (r->>'workspace_id')::uuid;
  if not exists (select 1 from public.workspaces where id = ws and kind = 'equipe') then return null; end if;
  act := case tg_op when 'INSERT' then 'criou' when 'DELETE' then 'excluiu' else 'editou' end;
  if tg_op = 'UPDATE' then
    if (r ? 'deleted_at') and (r->>'deleted_at') is not null and (to_jsonb(old)->>'deleted_at') is null then act := 'excluiu';
    elsif (r ? 'completed_at') and (r->>'completed_at') is not null and (to_jsonb(old)->>'completed_at') is null then act := 'concluiu';
    elsif (r ? 'done_at') and (r->>'done_at') is not null and (to_jsonb(old)->>'done_at') is null then act := 'concluiu';
    elsif exists (select 1 from public.activity_log a where a.entity_id = (r->>'id')::uuid and a.user_id is not distinct from auth.uid()
                  and a.action = 'editou' and a.created_at > now() - interval '10 minutes') then return null;
    end if;
  end if;
  if t in ('tasks', 'projects', 'scripts', 'prospects', 'action_plans') then rtype := t; rid := (r->>'id')::uuid;
  elsif t like 'action_plan_%' then rtype := 'action_plans'; rid := (r->>'plan_id')::uuid;
  end if;
  insert into public.activity_log (workspace_id, user_id, action, module, entity_type, entity_id, resource_type, resource_id, title)
  values (ws, auth.uid(), act, public.module_of(t), t, (r->>'id')::uuid, rtype, rid,
          left(coalesce(r->>'title', r->>'name', r->>'description'), 200));
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['tasks', 'projects', 'scripts', 'prospects', 'action_plans', 'action_plan_steps', 'action_plan_assets',
                           'goals', 'funnels', 'contacts', 'deals', 'proposals', 'content_items', 'deliveries', 'transactions',
                           'payables', 'receivables'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_activity', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.log_activity()', t || '_activity', t);
  end loop;
end $$;

create or replace function public.log_team_event(_ws uuid, _action text, _title text) returns void
language sql security definer set search_path = public as $$
  insert into public.activity_log (workspace_id, user_id, action, module, entity_type, title)
  values (_ws, auth.uid(), _action, 'equipe', 'workspace_members', _title) $$;
revoke execute on function public.log_team_event(uuid, text, text) from public, anon, authenticated;

-- ───────────────────────── criação de espaços ─────────────────────────
create or replace function public.seed_workspace(ws uuid, _business text default 'Pessoal', _kind business_kind default 'pessoal')
returns void language plpgsql security definer set search_path = public as $$
declare pl uuid; f text; i int := 0;
begin
  insert into public.businesses (workspace_id, name, kind, color, position) values (ws, _business, _kind, '#7c3aed', 0);
  foreach f in array array['Hoje','Semana','Copies','Gravações','Edições','Criativos','Campanhas','Clientes','Estudos','Pessoal','Financeiro'] loop
    insert into public.work_flows (workspace_id, name, position, is_system) values (ws, f, i, f in ('Hoje','Semana'));
    i := i + 1;
  end loop;
  insert into public.task_lists (workspace_id, name, position) values (ws, 'Tarefas', 0);
  insert into public.pipelines (workspace_id, name) values (ws, 'Comercial') returning id into pl;
  insert into public.pipeline_stages (workspace_id, pipeline_id, name, position, outcome, set_contact_status) values
    (ws, pl, 'Novo lead', 0, 'open', 'lead'), (ws, pl, 'Diagnóstico', 1, 'open', null),
    (ws, pl, 'Reunião marcada', 2, 'open', null), (ws, pl, 'Proposta enviada', 3, 'open', 'em_negociacao'),
    (ws, pl, 'Em negociação', 4, 'open', 'em_negociacao'), (ws, pl, 'Fechado', 5, 'won', 'cliente_ativo'),
    (ws, pl, 'Onboarding', 6, 'won', 'cliente_ativo'), (ws, pl, 'Cliente ativo', 7, 'won', 'cliente_ativo'),
    (ws, pl, 'Perdido', 8, 'lost', 'perdido');
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
end $$;
revoke execute on function public.seed_workspace(uuid, text, business_kind) from public, anon, authenticated;

-- Toda conta nova ganha o próprio espaço privado; convites por e-mail pendentes entram junto.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare ws uuid; inv record;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.workspaces (name, owner_id, kind) values ('Meu Superflow', new.id, 'pessoal') returning id into ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws, new.id, 'owner');
  perform public.seed_workspace(ws);

  for inv in select * from public.workspace_invites
             where email = lower(new.email) and accepted_at is null and expires_at > now() loop
    insert into public.workspace_members (workspace_id, user_id, role, permissions)
    values (inv.workspace_id, new.id, inv.role, inv.permissions) on conflict do nothing;
    update public.workspace_invites set accepted_at = now(), accepted_by = new.id where id = inv.id;
  end loop;
  return new;
end $$;

create or replace function public.create_team(_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare ws uuid; n text := nullif(trim(_name), '');
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
  if n is null then raise exception 'Dê um nome para a equipe.'; end if;
  insert into public.workspaces (name, owner_id, kind) values (left(n, 80), auth.uid(), 'equipe') returning id into ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws, auth.uid(), 'owner');
  perform public.seed_workspace(ws, left(n, 80), 'agencia');
  perform public.log_team_event(ws, 'criou a equipe', n);
  return ws;
end $$;

-- ───────────────────────── permissões ─────────────────────────
create or replace function public.clean_permissions(_p jsonb) returns jsonb
language plpgsql immutable set search_path = public as $$
declare k text; v text; out jsonb := '{}'::jsonb;
begin
  for k, v in select key, value #>> '{}' from jsonb_each(coalesce(_p, '{}'::jsonb)) loop
    if k not in ('tarefas','projetos','metas','funis','planos','comercial','prospeccao','scripts','marketing','financeiro','central','telegram') then
      raise exception 'Módulo desconhecido: %', k;
    end if;
    if v not in ('none','view','edit','manage') then raise exception 'Nível inválido: %', v; end if;
    if v <> 'none' then out := out || jsonb_build_object(k, v); end if;
  end loop;
  return out;
end $$;

create or replace function public.team_members(_ws uuid)
returns table (user_id uuid, full_name text, email text, role member_role, permissions jsonb, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.full_name, u.email::text, m.role,
         case when public.is_manager(_ws) or m.user_id = auth.uid() then m.permissions else null end, m.created_at
  from public.workspace_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.workspace_id = _ws
    and exists (select 1 from public.workspace_members me where me.workspace_id = _ws and me.user_id = auth.uid())
  order by (m.role = 'owner') desc, m.created_at $$;

create or replace function public.my_access(_ws uuid)
returns table (role member_role, kind text, permissions jsonb, granted_modules text[])
language sql stable security definer set search_path = public as $$
  select m.role, w.kind, m.permissions,
         coalesce((select array_agg(distinct public.resource_module(g.resource_type)) from public.resource_grants g
                   where g.workspace_id = _ws and g.user_id = auth.uid()), '{}')
  from public.workspace_members m join public.workspaces w on w.id = m.workspace_id
  where m.workspace_id = _ws and m.user_id = auth.uid() $$;

/** Dono/admin mudam papel e permissões. Só o dono mexe em admin. Ninguém mexe no dono. */
create or replace function public.set_member_access(_ws uuid, _user uuid, _role member_role, _permissions jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare cur member_role; me member_role; who text;
begin
  select role into me from public.workspace_members where workspace_id = _ws and user_id = auth.uid();
  if me is null or me not in ('owner', 'admin') then raise exception 'Só dono ou admin mudam permissões.'; end if;
  select role into cur from public.workspace_members where workspace_id = _ws and user_id = _user;
  if cur is null then raise exception 'Essa pessoa não está na equipe.'; end if;
  if cur = 'owner' or _role = 'owner' then raise exception 'O dono não pode ser alterado.'; end if;
  if me <> 'owner' and (cur = 'admin' or _role = 'admin') then raise exception 'Só o dono define administradores.'; end if;
  update public.workspace_members set role = _role, permissions = public.clean_permissions(_permissions)
   where workspace_id = _ws and user_id = _user;
  select coalesce(p.full_name, u.email) into who from auth.users u left join public.profiles p on p.id = u.id where u.id = _user;
  perform public.log_team_event(_ws, 'mudou as permissões de', who);
end $$;

create or replace function public.remove_member(_ws uuid, _user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cur member_role; me member_role; who text;
begin
  select role into me from public.workspace_members where workspace_id = _ws and user_id = auth.uid();
  select role into cur from public.workspace_members where workspace_id = _ws and user_id = _user;
  if cur is null then return; end if;
  if cur = 'owner' then raise exception 'O dono não pode sair nem ser removido.'; end if;
  if _user <> auth.uid() then
    if me is null or me not in ('owner', 'admin') then raise exception 'Só dono ou admin removem pessoas.'; end if;
    if me <> 'owner' and cur = 'admin' then raise exception 'Só o dono remove administradores.'; end if;
  end if;
  select coalesce(p.full_name, u.email) into who from auth.users u left join public.profiles p on p.id = u.id where u.id = _user;
  delete from public.resource_grants where workspace_id = _ws and user_id = _user;
  delete from public.workspace_members where workspace_id = _ws and user_id = _user;
  perform public.log_team_event(_ws, case when _user = auth.uid() then 'saiu da equipe' else 'removeu' end, who);
end $$;

-- ───────────────────────── convites ─────────────────────────
create or replace function public.create_invite(_ws uuid, _email text, _role member_role, _permissions jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me member_role; v_email text := nullif(lower(trim(coalesce(_email, ''))), ''); v_user uuid; tok text; perms jsonb;
begin
  select role into me from public.workspace_members where workspace_id = _ws and user_id = auth.uid();
  if me is null or me not in ('owner', 'admin') then raise exception 'Só dono ou admin convidam.'; end if;
  if not exists (select 1 from public.workspaces where id = _ws and kind = 'equipe') then
    raise exception 'Seu espaço pessoal é privado. Crie uma equipe para convidar pessoas.';
  end if;
  if _role = 'owner' then raise exception 'Papel inválido.'; end if;
  if _role = 'admin' and me <> 'owner' then raise exception 'Só o dono convida administradores.'; end if;
  perms := public.clean_permissions(_permissions);
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido.'; end if;

  if v_email is not null then
    select id into v_user from auth.users where lower(email) = v_email;
    if v_user is not null and exists (select 1 from public.workspace_members where workspace_id = _ws and user_id = v_user) then
      raise exception 'Essa pessoa já está na equipe.';
    end if;
    if v_user is not null then
      insert into public.workspace_members (workspace_id, user_id, role, permissions) values (_ws, v_user, _role, perms);
      perform public.log_team_event(_ws, 'adicionou', v_email);
      return jsonb_build_object('status', 'adicionado');
    end if;
    delete from public.workspace_invites where workspace_id = _ws and email = v_email and accepted_at is null;
  end if;

  insert into public.workspace_invites (workspace_id, email, role, permissions, invited_by)
  values (_ws, v_email, _role, perms, auth.uid()) returning token into tok;
  perform public.log_team_event(_ws, 'criou um convite', coalesce(v_email, 'por link'));
  return jsonb_build_object('status', 'convidado', 'token', tok);
end $$;

-- Compatibilidade com a tela antiga (convite por e-mail, sem permissões de módulo).
create or replace function public.invite_member(_ws uuid, _email text, _role member_role default 'member')
returns text language plpgsql security definer set search_path = public as $$
begin
  return public.create_invite(_ws, _email, _role, '{}'::jsonb)->>'status';
end $$;

/** O que aparece na página do convite (sem login): só nome da equipe e de quem convidou. */
create or replace function public.invite_preview(_token text)
returns table (workspace_name text, invited_by_name text, email text, valid boolean)
language sql stable security definer set search_path = public as $$
  select w.name, coalesce(p.full_name, 'Alguém'), i.email,
         i.accepted_at is null and i.expires_at > now()
  from public.workspace_invites i
  join public.workspaces w on w.id = i.workspace_id
  left join public.profiles p on p.id = i.invited_by
  where i.token = _token $$;

create or replace function public.accept_invite(_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv record; my_email text;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para aceitar o convite.'; end if;
  select * into inv from public.workspace_invites where token = _token for update;
  if not found then raise exception 'Convite não encontrado.'; end if;
  if exists (select 1 from public.workspace_members where workspace_id = inv.workspace_id and user_id = auth.uid()) then
    return inv.workspace_id;
  end if;
  if inv.accepted_at is not null then raise exception 'Este convite já foi usado.'; end if;
  if inv.expires_at <= now() then raise exception 'Este convite expirou. Peça um novo.'; end if;
  select lower(email) into my_email from auth.users where id = auth.uid();
  if inv.email is not null and inv.email <> my_email then
    raise exception 'Este convite foi feito para outro e-mail (%).', inv.email;
  end if;
  insert into public.workspace_members (workspace_id, user_id, role, permissions)
  values (inv.workspace_id, auth.uid(), inv.role, inv.permissions);
  update public.workspace_invites set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  perform public.log_team_event(inv.workspace_id, 'entrou na equipe', my_email);
  return inv.workspace_id;
end $$;

-- ───────────────────────── acesso por item ─────────────────────────
create or replace function public.resource_title(_type text, _id uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare t text;
begin
  case _type
    when 'tasks' then select title into t from public.tasks where id = _id;
    when 'projects' then select name into t from public.projects where id = _id;
    when 'scripts' then select title into t from public.scripts where id = _id;
    when 'prospects' then select name into t from public.prospects where id = _id;
    when 'action_plans' then select title into t from public.action_plans where id = _id;
    else t := null;
  end case;
  return t;
end $$;

create or replace function public.resource_ws(_type text, _id uuid) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare w uuid;
begin
  case _type
    when 'tasks' then select workspace_id into w from public.tasks where id = _id;
    when 'projects' then select workspace_id into w from public.projects where id = _id;
    when 'scripts' then select workspace_id into w from public.scripts where id = _id;
    when 'prospects' then select workspace_id into w from public.prospects where id = _id;
    when 'action_plans' then select workspace_id into w from public.action_plans where id = _id;
    else raise exception 'Tipo inválido.';
  end case;
  if w is null then raise exception 'Item não encontrado.'; end if;
  return w;
end $$;

create or replace function public.my_resource_level(_type text, _id uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare w uuid; p uuid;
begin
  w := public.resource_ws(_type, _id);
  if _type = 'tasks' then select project_id into p from public.tasks where id = _id; return public.task_level(_id, w, p); end if;
  return public.resource_level(_type, _id, w);
end $$;

/** Quem acessa um item e com qual nível (só para quem gerencia o item). */
create or replace function public.resource_access(_type text, _id uuid)
returns table (user_id uuid, full_name text, email text, role member_role, module_level text, grant_level text, restricted boolean)
language plpgsql stable security definer set search_path = public as $$
declare w uuid;
begin
  w := public.resource_ws(_type, _id);
  if public.my_resource_level(_type, _id) < 3 then raise exception 'Você não gerencia o acesso deste item.'; end if;
  return query
    select m.user_id, p.full_name, u.email::text, m.role,
           case when m.role in ('owner','admin') then 'manage' else coalesce(m.permissions->>public.resource_module(_type), 'none') end,
           g.level,
           exists (select 1 from public.restricted_resources r where r.resource_type = _type and r.resource_id = _id)
    from public.workspace_members m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
    left join public.resource_grants g on g.resource_type = _type and g.resource_id = _id and g.user_id = m.user_id
    where m.workspace_id = w
    order by (m.role = 'owner') desc, m.created_at;
end $$;

/** Libera (ou tira, _level null) um item para alguém da equipe. Ninguém dá mais do que tem. */
create or replace function public.set_resource_grant(_type text, _id uuid, _user uuid, _level text)
returns void language plpgsql security definer set search_path = public as $$
declare w uuid; mine int;
begin
  w := public.resource_ws(_type, _id);
  mine := public.my_resource_level(_type, _id);
  if mine < 3 then raise exception 'Você não gerencia o acesso deste item.'; end if;
  if not exists (select 1 from public.workspace_members where workspace_id = w and user_id = _user) then
    raise exception 'Essa pessoa não está na equipe.';
  end if;
  if _level is null or _level = 'none' then
    delete from public.resource_grants where resource_type = _type and resource_id = _id and user_id = _user;
  else
    if public.level_num(_level) = 0 then raise exception 'Nível inválido.'; end if;
    if public.level_num(_level) > mine then raise exception 'Você não pode dar mais acesso do que tem.'; end if;
    insert into public.resource_grants (workspace_id, resource_type, resource_id, user_id, level, granted_by)
    values (w, _type, _id, _user, _level, auth.uid())
    on conflict (resource_type, resource_id, user_id) do update set level = excluded.level, granted_by = excluded.granted_by;
  end if;
  insert into public.activity_log (workspace_id, user_id, action, module, entity_type, entity_id, resource_type, resource_id, title)
  values (w, auth.uid(), 'mudou o acesso de', public.resource_module(_type), _type, _id, _type, _id, public.resource_title(_type, _id));
end $$;

/** Restrito = só quem foi liberado no item (e quem gerencia o módulo). Quem restringe fica liberado. */
create or replace function public.set_resource_restricted(_type text, _id uuid, _restricted boolean)
returns void language plpgsql security definer set search_path = public as $$
declare w uuid;
begin
  w := public.resource_ws(_type, _id);
  if public.my_resource_level(_type, _id) < 3 then raise exception 'Você não gerencia o acesso deste item.'; end if;
  if _restricted then
    insert into public.resource_grants (workspace_id, resource_type, resource_id, user_id, level, granted_by)
    values (w, _type, _id, auth.uid(), 'manage', auth.uid())
    on conflict (resource_type, resource_id, user_id) do update set level = 'manage';
    insert into public.restricted_resources (resource_type, resource_id, workspace_id, restricted_by)
    values (_type, _id, w, auth.uid()) on conflict do nothing;
  else
    delete from public.restricted_resources where resource_type = _type and resource_id = _id;
  end if;
end $$;

/** Tudo que uma pessoa acessa na equipe: módulos + itens liberados (visão inversa). */
create or replace function public.member_access(_ws uuid, _user uuid)
returns table (kind text, key text, label text, level text, restricted boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_manager(_ws) and _user <> auth.uid() then raise exception 'Só dono ou admin veem o acesso de outras pessoas.'; end if;
  return query
    select 'modulo'::text, e.key, e.key, e.value #>> '{}', false
    from public.workspace_members m, jsonb_each(m.permissions) e
    where m.workspace_id = _ws and m.user_id = _user
    union all
    select 'item'::text, g.resource_type || ':' || g.resource_id, public.resource_title(g.resource_type, g.resource_id), g.level,
           exists (select 1 from public.restricted_resources r where r.resource_type = g.resource_type and r.resource_id = g.resource_id)
    from public.resource_grants g where g.workspace_id = _ws and g.user_id = _user;
end $$;

-- ───────────────────────── mover para outro espaço ─────────────────────────
-- Leva o próprio item (não copia). Vínculos que só existem no espaço de origem
-- (negócio, contato, meta, funil) ficam vazios; lista e fluxo são casados pelo nome.
create or replace function public.move_tasks_to(_ids uuid[], _target uuid) returns void
language plpgsql security definer set search_path = public as $$
declare list uuid;
begin
  select id into list from public.task_lists where workspace_id = _target and deleted_at is null order by position limit 1;
  update public.tasks t set workspace_id = _target, business_id = null, contact_id = null, goal_id = null,
         funnel_id = null, funnel_node = null, list_id = list,
         flow_id = (select f2.id from public.work_flows f1 join public.work_flows f2 on f2.name = f1.name and f2.workspace_id = _target
                    where f1.id = t.flow_id limit 1),
         assignee_id = case when exists (select 1 from public.workspace_members m where m.workspace_id = _target and m.user_id = t.assignee_id)
                            then t.assignee_id end
   where t.id = any(_ids);
  update public.task_steps set workspace_id = _target where task_id = any(_ids);
  delete from public.resource_grants where resource_type = 'tasks' and resource_id = any(_ids);
  delete from public.restricted_resources where resource_type = 'tasks' and resource_id = any(_ids);
end $$;
revoke execute on function public.move_tasks_to(uuid[], uuid) from public, anon, authenticated;

create or replace function public.move_to_workspace(_type text, _id uuid, _target uuid) returns void
language plpgsql security definer set search_path = public as $$
declare src uuid; seg record; new_seg uuid; ids uuid[];
begin
  src := public.resource_ws(_type, _id);
  if src = _target then return; end if;
  if public.my_resource_level(_type, _id) < 3 then raise exception 'Você precisa gerenciar este item para movê-lo.'; end if;
  if public.member_level(_target, public.resource_module(_type)) < 2 then
    raise exception 'Você não tem permissão de edição nesse módulo do espaço de destino.';
  end if;

  if _type = 'tasks' then
    update public.tasks set project_id = null where id = _id;
    perform public.move_tasks_to(array[_id], _target);
  elsif _type = 'projects' then
    update public.projects set workspace_id = _target, business_id = null, contact_id = null where id = _id;
    select array_agg(id) into ids from public.tasks where project_id = _id;
    if ids is not null then perform public.move_tasks_to(ids, _target); end if;
  elsif _type = 'scripts' then
    select * into seg from public.script_segments s where s.id = (select segment_id from public.scripts where id = _id);
    if seg.id is not null then
      select id into new_seg from public.script_segments where workspace_id = _target and name = seg.name limit 1;
      if new_seg is null then
        insert into public.script_segments (workspace_id, name, position, description, service_type, categories, variables)
        values (_target, seg.name, seg.position, seg.description, seg.service_type, seg.categories, seg.variables) returning id into new_seg;
      end if;
    end if;
    update public.scripts set workspace_id = _target, segment_id = new_seg where id = _id;
  elsif _type = 'prospects' then
    update public.prospects set workspace_id = _target, search_id = null, campaign_id = null, converted_contact_id = null where id = _id;
  elsif _type = 'action_plans' then
    update public.action_plans set workspace_id = _target, business_id = null where id = _id;
    update public.action_plan_steps set workspace_id = _target where plan_id = _id;
    update public.action_plan_assets set workspace_id = _target where plan_id = _id;
    update public.action_plan_checkins set workspace_id = _target where plan_id = _id;
  end if;

  delete from public.resource_grants where resource_type = _type and resource_id = _id;
  delete from public.restricted_resources where resource_type = _type and resource_id = _id;
  insert into public.activity_log (workspace_id, user_id, action, module, entity_type, entity_id, resource_type, resource_id, title)
  values (_target, auth.uid(), 'trouxe para a equipe', public.resource_module(_type), _type, _id, _type, _id, public.resource_title(_type, _id));
end $$;

-- ───────────────────────── tempo real ─────────────────────────
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then return; end if;
  foreach t in array array['tasks', 'task_steps', 'projects', 'scripts', 'prospects', 'action_plans', 'action_plan_steps',
                           'action_plan_assets', 'goals', 'contacts', 'deals', 'activity_log', 'workspace_members'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ───────────────────────── permissões de execução ─────────────────────────
grant execute on function public.invite_preview(text) to anon, authenticated;
grant select on public.resource_grants, public.restricted_resources, public.activity_log to authenticated;
-- Funções internas (só chamadas por outras funções do sistema).
revoke execute on function public.resource_title(text, uuid) from public, anon, authenticated;
revoke execute on function public.resource_ws(text, uuid) from public, anon, authenticated;
revoke execute on function public.log_activity() from public, anon, authenticated;
