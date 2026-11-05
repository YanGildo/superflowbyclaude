-- Planos de ação: um plano com etapas (checklist por fase), scripts/prompts para copiar,
-- o documento completo e os números da semana. Junta num lugar só o que está espalhado pelas abas.

create table public.action_plans (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id  uuid references public.businesses(id) on delete set null,
  title        text not null check (length(trim(title)) > 0),
  goal         text,                                  -- meta em uma frase
  summary      text,                                  -- resumo curto (markdown)
  document     text,                                  -- plano completo (markdown), aberto no painel lateral
  doc_url      text,                                  -- link do documento original (ex.: Claude)
  status       text not null default 'ativo' check (status in ('ativo','pausado','concluido')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index action_plans_ws_idx on public.action_plans (workspace_id, status);
create trigger action_plans_updated_at before update on public.action_plans for each row execute function public.set_updated_at();

create table public.action_plan_steps (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan_id      uuid not null references public.action_plans(id) on delete cascade,
  phase        text not null default 'Etapas',        -- ex.: "Semana 1 · Preparar"
  position     int not null default 0,
  title        text not null check (length(trim(title)) > 0),
  details      text,                                  -- como fazer (markdown curto)
  link_path    text,                                  -- tela do Superflow onde se faz (ex.: /prospeccao?aba=buscar)
  link_label   text,
  repeat       boolean not null default false,        -- rotina que se repete (sem marcar como feito)
  due_date     date,
  done_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index action_plan_steps_plan_idx on public.action_plan_steps (plan_id, position);

create table public.action_plan_assets (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan_id      uuid not null references public.action_plans(id) on delete cascade,
  step_id      uuid references public.action_plan_steps(id) on delete set null,
  kind         text not null default 'nota' check (kind in ('script','prompt','nota','link')),
  title        text not null check (length(trim(title)) > 0),
  body         text,
  url          text,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);
create index action_plan_assets_plan_idx on public.action_plan_assets (plan_id, position);

create table public.action_plan_checkins (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan_id      uuid not null references public.action_plans(id) on delete cascade,
  week_start   date not null,
  values       jsonb not null default '{}'::jsonb,    -- {contatos, respostas, demos, propostas, vendas, faturamento, custo_conversa}
  notes        text,
  created_at   timestamptz not null default now(),
  unique (plan_id, week_start)
);

do $$
declare t text;
begin
  foreach t in array array['action_plans','action_plan_steps','action_plan_assets','action_plan_checkins'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select using (public.is_member(workspace_id))', t || '_read', t);
    execute format('create policy %I on public.%I for insert with check (public.can_write(workspace_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update using (public.can_write(workspace_id)) with check (public.can_write(workspace_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete using (public.can_write(workspace_id))', t || '_delete', t);
  end loop;
end $$;
