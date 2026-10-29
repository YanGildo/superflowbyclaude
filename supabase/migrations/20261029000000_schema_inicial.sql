-- =====================================================================
-- SUPERFLOW V2 — SCHEMA COMPLETO (Postgres / Supabase)
-- ---------------------------------------------------------------------
-- Migração única. Substitui os ~50 stores em localStorage do projeto
-- Lovable + as tabelas parciais do Supabase antigo.
--
-- Organização:
--   0. Extensões e helpers
--   1. Núcleo: perfis, workspace, membros, negócios
--   2. Produtividade: fluxos, listas, tarefas, projetos, metas, funis
--   3. Comercial: contatos, pipeline, oportunidades, atividades,
--      serviços, propostas, scripts, prospecção
--   4. Marketing: plano, campanhas, conteúdo, entregas
--   5. Financeiro: contas, cartões, categorias, lançamentos,
--      pagar/receber, dívidas, reservas, metas, ofertas, vendas
--   6. Vendas Telegram: robôs, fluxos, leads, sessões, mensagens,
--      eventos, gateways, pagamentos, grupos VIP, assinaturas,
--      remarketing, links de rastreio
--   7. Automações (triggers)
--   8. Views de métricas
--   9. RLS (segurança por workspace)
--  10. Onboarding automático de novo usuário
--  11. Funções para jobs agendados (pg_cron em arquivo separado)
-- =====================================================================

-- 0. EXTENSÕES E HELPERS ------------------------------------------------
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- 1. NÚCLEO ------------------------------------------------------------

create type public.member_role as enum ('owner','admin','member','viewer');

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  phone       text,
  timezone    text not null default 'America/Sao_Paulo',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users(id),
  settings    jsonb not null default '{}'::jsonb,   -- tema, menu, metas de faturamento etc.
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         public.member_role not null default 'member',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- Usado por todas as políticas RLS. security definer evita recursão.
create or replace function public.is_member(_ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = _ws and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_write(_ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = _ws and m.user_id = auth.uid() and m.role <> 'viewer'
  );
$$;

-- "Negócio" substitui os antigos "espaços": Pessoal, RG Marketing, RG Studio...
create type public.business_kind as enum ('pessoal','agencia','saas','infoproduto','servico','telegram','outro');

create table public.businesses (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  kind         public.business_kind not null default 'outro',
  color        text,
  icon         text,
  position     int not null default 0,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, name)
);

-- 2. PRODUTIVIDADE -----------------------------------------------------

create type public.priority as enum ('baixa','media','alta','urgente');
create type public.task_status as enum ('pendente','em_andamento','aguardando','concluida');

-- Antigos "Fluxos" (Copies, Gravações, Edições...) viram cadastro editável.
create table public.work_flows (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  color        text,
  position     int not null default 0,
  is_system    boolean not null default false,   -- Hoje/Semana não podem ser removidos
  created_at   timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.task_lists (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id  uuid references public.businesses(id) on delete set null,
  name         text not null,
  color        text,
  position     int not null default 0,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.projects (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  business_id    uuid references public.businesses(id) on delete set null,
  contact_id     uuid,                                  -- FK adicionada depois de contacts
  name           text not null,
  description    text,
  category       text,                                  -- SaaS, Serviço, Cliente, Campanha...
  status         text not null default 'planejado',
  progress       int not null default 0 check (progress between 0 and 100),
  priority       public.priority not null default 'media',
  start_date     date,
  deadline       date,
  link           text,
  sales_model    text,
  ticket_average numeric(14,2),
  next_actions   text[] not null default '{}',
  color          text,
  position       int not null default 0,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.goals (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  business_id   uuid references public.businesses(id) on delete set null,
  project_id    uuid references public.projects(id) on delete set null,
  title         text not null,
  description   text,
  category      text,                                   -- Produtividade, Financeiro, Vendas...
  status        text not null default 'ativa' check (status in ('ativa','pausada','concluida')),
  priority      public.priority not null default 'media',
  target_value  numeric(14,2),
  current_value numeric(14,2) not null default 0,
  deadline      date,
  color         text,
  position      int not null default 0,
  completed_at  timestamptz,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.goal_steps (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  goal_id      uuid not null references public.goals(id) on delete cascade,
  title        text not null,
  done         boolean not null default false,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

-- Tarefa única: une tarefas gerais + Tasks (To Do) + tarefas de funil.
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  business_id   uuid references public.businesses(id) on delete set null,
  list_id       uuid references public.task_lists(id) on delete set null,
  flow_id       uuid references public.work_flows(id) on delete set null,
  project_id    uuid references public.projects(id) on delete set null,
  goal_id       uuid references public.goals(id) on delete set null,
  contact_id    uuid,                                   -- FK depois
  funnel_id     uuid,                                   -- FK depois
  funnel_node   text,                                   -- id do nó no canvas
  title         text not null check (length(trim(title)) > 0),
  notes         text,
  status        public.task_status not null default 'pendente',
  priority      public.priority not null default 'media',
  tags          text[] not null default '{}',
  is_important  boolean not null default false,
  my_day_date   date,                                   -- "Meu dia" / "Hoje"
  due_date      date,
  reminder_at   timestamptz,
  reminder_sent_at timestamptz,
  recurrence    text not null default 'none'
                check (recurrence in ('none','daily','weekdays','weekly','monthly','yearly')),
  estimate      text,
  assignee_id   uuid references auth.users(id) on delete set null,
  position      int not null default 0,
  completed_at  timestamptz,
  created_by    uuid references auth.users(id) default auth.uid(),
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index tasks_ws_open_idx on public.tasks (workspace_id, status) where deleted_at is null;
create index tasks_due_idx     on public.tasks (workspace_id, due_date) where deleted_at is null;

create table public.task_steps (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id      uuid not null references public.tasks(id) on delete cascade,
  title        text not null,
  done         boolean not null default false,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

-- Funis visuais (React Flow): o canvas inteiro fica em jsonb, como hoje.
create table public.funnels (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id  uuid references public.businesses(id) on delete set null,
  name         text not null,
  nodes        jsonb not null default '[]'::jsonb,
  edges        jsonb not null default '[]'::jsonb,
  checklist    jsonb not null default '[]'::jsonb,
  links        jsonb not null default '{}'::jsonb,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.tasks add constraint tasks_funnel_fk
  foreign key (funnel_id) references public.funnels(id) on delete set null;

-- 3. COMERCIAL ---------------------------------------------------------

create type public.contact_status as enum ('lead','em_negociacao','cliente_ativo','pausado','cancelado','perdido');

-- Cadastro único de leads e clientes (substitui Client, AgencyClient e leads simulados).
create table public.contacts (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  business_id      uuid references public.businesses(id) on delete set null,
  kind             text not null default 'empresa' check (kind in ('pessoa','empresa')),
  name             text not null check (length(trim(name)) > 0),
  company          text,
  contact_person   text,
  email            text,
  phone            text,
  whatsapp         text,
  instagram        text,
  website          text,
  city             text,
  state            text,
  country          text,
  segment          text,
  source           text,                                -- indicação, prospecção, telegram, anúncio...
  status           public.contact_status not null default 'lead',
  temperature      text check (temperature in ('frio','morno','quente')),
  priority         public.priority not null default 'media',
  responsible_id   uuid references auth.users(id) on delete set null,
  plan_name        text,
  monthly_value    numeric(14,2),
  start_date       date,
  services         text[] not null default '{}',
  next_action      text,
  next_contact_at  timestamptz,
  notes            text,
  prospect_id      uuid,                                -- origem na prospecção (FK depois)
  meta             jsonb not null default '{}'::jsonb,  -- nota no Maps, score etc.
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index contacts_ws_status_idx on public.contacts (workspace_id, status) where deleted_at is null;

alter table public.projects add constraint projects_contact_fk
  foreign key (contact_id) references public.contacts(id) on delete set null;
alter table public.tasks add constraint tasks_contact_fk
  foreign key (contact_id) references public.contacts(id) on delete set null;

create table public.pipelines (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id  uuid references public.businesses(id) on delete set null,
  name         text not null,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

create table public.pipeline_stages (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  pipeline_id         uuid not null references public.pipelines(id) on delete cascade,
  name                text not null,
  position            int not null default 0,
  outcome             text not null default 'open' check (outcome in ('open','won','lost')),
  set_contact_status  public.contact_status,            -- ex.: "Cliente ativo" => cliente_ativo
  color               text,
  created_at          timestamptz not null default now()
);

create table public.deals (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  business_id      uuid references public.businesses(id) on delete set null,
  contact_id       uuid not null references public.contacts(id) on delete cascade,
  pipeline_id      uuid not null references public.pipelines(id) on delete cascade,
  stage_id         uuid not null references public.pipeline_stages(id),
  title            text not null,
  value            numeric(14,2),                       -- valor único
  recurring_value  numeric(14,2),                       -- mensalidade
  expected_close   date,
  status           text not null default 'open' check (status in ('open','won','lost')),
  lost_reason      text,
  responsible_id   uuid references auth.users(id) on delete set null,
  position         int not null default 0,
  closed_at        timestamptz,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Registro de contatos + conversões (antes: ContactLog e Conversion separados).
create table public.activities (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  contact_id         uuid references public.contacts(id) on delete cascade,
  deal_id            uuid references public.deals(id) on delete set null,
  type               text not null,      -- mensagem, ligacao, reuniao, proposta_enviada, venda_fechada...
  channel            text,               -- whatsapp, email, telefone, instagram, presencial, telegram
  summary            text,
  notes              text,
  outcome            text,
  value              numeric(14,2),
  at                 timestamptz not null default now(),
  next_follow_up_at  timestamptz,
  responsible_id     uuid references auth.users(id) on delete set null,
  origin             text not null default 'manual',
  created_at         timestamptz not null default now()
);
create index activities_contact_idx on public.activities (contact_id, at desc);

-- Catálogo de serviços da agência (Gestão de tráfego, Social media...).
create table public.services (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  business_id    uuid references public.businesses(id) on delete set null,
  name           text not null,
  description    text,
  default_price  numeric(14,2),
  recurring      boolean not null default true,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create type public.proposal_status as enum ('rascunho','enviada','em_negociacao','aprovada','recusada','expirada');

create table public.proposals (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  business_id      uuid references public.businesses(id) on delete set null,
  contact_id       uuid not null references public.contacts(id) on delete cascade,
  deal_id          uuid references public.deals(id) on delete set null,
  title            text not null,
  status           public.proposal_status not null default 'rascunho',
  monthly_value    numeric(14,2) not null default 0,
  setup_fee        numeric(14,2) not null default 0,
  min_term_months  int,
  payment_method   text,
  billing_day      int check (billing_day between 1 and 28),
  valid_until      date,
  sent_at          timestamptz,
  approved_at      timestamptz,
  notes            text,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.proposal_items (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  proposal_id  uuid not null references public.proposals(id) on delete cascade,
  service_id   uuid references public.services(id) on delete set null,
  description  text not null,
  quantity     numeric(10,2) not null default 1,
  unit_price   numeric(14,2) not null default 0,
  recurring    boolean not null default true,
  position     int not null default 0
);

create table public.script_segments (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

create table public.scripts (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  segment_id   uuid references public.script_segments(id) on delete set null,
  title        text not null,
  category     text,                 -- Abordagem inicial, Qualificação, Fechamento, Objeções...
  moment       text,
  channel      text not null default 'WhatsApp',
  body         text not null,        -- aceita variáveis {{nome}}
  tags         text[] not null default '{}',
  favorite     boolean not null default false,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Prospecção (Apify / Google Maps) — mantém a estrutura que já funciona.
create table public.prospect_niches (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid references public.workspaces(id) on delete cascade,  -- null = nicho global
  name           text not null,
  category       text not null,
  description    text,
  terms_pt       text[] not null default '{}',
  terms_en       text[] not null default '{}',
  excluded_terms text[] not null default '{}',
  countries      text[] not null default '{}',
  tags           text[] not null default '{}',
  ticket         text,
  model          text,
  favorite       boolean not null default false,
  active         boolean not null default true,
  position       int not null default 0,
  created_at     timestamptz not null default now()
);

create table public.prospect_campaigns (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  niche        text,
  location     text,
  objective    text,
  status       text not null default 'planejada',
  created_at   timestamptz not null default now()
);

create table public.prospect_searches (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  user_id            uuid references auth.users(id) on delete set null,
  name               text,
  is_saved           boolean not null default false,  -- busca salva vs execução
  filters            jsonb not null default '{}'::jsonb,
  provider_run_id    text,
  dataset_id         text,
  status             text not null default 'pending',
  location           text,
  requested_limit    int,
  result_count       int not null default 0,
  new_count          int not null default 0,
  duplicate_count    int not null default 0,
  error_message      text,
  started_at         timestamptz,
  finished_at        timestamptz,
  created_at         timestamptz not null default now()
);

create table public.prospects (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  search_id           uuid references public.prospect_searches(id) on delete set null,
  campaign_id         uuid references public.prospect_campaigns(id) on delete set null,
  place_id            text,
  name                text not null,
  category            text,
  niche               text,
  address             text,
  neighborhood        text,
  city                text,
  state               text,
  country             text,
  latitude            double precision,
  longitude           double precision,
  phone               text,
  whatsapp            text,
  email               text,
  website             text,
  instagram           text,
  facebook            text,
  maps_url            text,
  rating              numeric(3,2),
  reviews_count       int,
  status              text not null default 'Novo',
  temperature         text,
  priority            text not null default 'normal',
  score               int,
  score_reasons       text[] not null default '{}',
  notes               text,
  approach_history    jsonb not null default '[]'::jsonb,
  last_approach_at    timestamptz,
  converted_contact_id uuid references public.contacts(id) on delete set null,
  raw_data            jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (workspace_id, place_id)
);
alter table public.contacts add constraint contacts_prospect_fk
  foreign key (prospect_id) references public.prospects(id) on delete set null;

-- 4. MARKETING ---------------------------------------------------------

create table public.marketing_plans (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id  uuid references public.businesses(id) on delete cascade,
  goal         text,
  audience     text,
  offer        text,
  channels     text[] not null default '{}',
  notes        text,
  updated_at   timestamptz not null default now(),
  unique (workspace_id, business_id)
);

create table public.campaigns (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  business_id     uuid references public.businesses(id) on delete set null,
  contact_id      uuid references public.contacts(id) on delete set null,   -- cliente da agência
  name            text not null,
  platform        text not null,        -- Meta Ads, Google Ads, TikTok, YouTube, LinkedIn, Orgânico, Telegram
  objective       text,                 -- Leads, Vendas, Tráfego, Mensagens, Reconhecimento
  status          text not null default 'planejada' check (status in ('planejada','ativa','pausada','encerrada')),
  daily_budget    numeric(14,2),
  total_budget    numeric(14,2),
  spend           numeric(14,2) not null default 0,
  leads           int not null default 0,
  sales           int not null default 0,
  revenue         numeric(14,2) not null default 0,
  start_date      date,
  end_date        date,
  landing_page    text,
  tracking_param  text,                 -- liga campanha ao ?start= do Telegram / UTM
  notes           text,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Conteúdos e vídeos num pipeline só (antes: 4 módulos diferentes).
create table public.content_items (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  business_id    uuid references public.businesses(id) on delete set null,
  contact_id     uuid references public.contacts(id) on delete set null,
  campaign_id    uuid references public.campaigns(id) on delete set null,
  project_id     uuid references public.projects(id) on delete set null,
  title          text not null,
  kind           text not null,        -- Post, Reels, Story, Carrossel, Vídeo, Anúncio, Roteiro, Copy...
  channel        text,                 -- Instagram, TikTok, YouTube, Telegram...
  objective      text,
  stage          text not null default 'ideia'
                 check (stage in ('ideia','roteiro','gravacao','edicao','revisao','aprovado','publicado','pausado')),
  priority       public.priority not null default 'media',
  responsible_id uuid references auth.users(id) on delete set null,
  script         text,
  caption        text,
  recording_at   date,
  due_date       date,
  publish_at     timestamptz,
  file_url       text,
  notes          text,
  position       int not null default 0,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.deliveries (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  contact_id       uuid references public.contacts(id) on delete cascade,
  proposal_id      uuid references public.proposals(id) on delete set null,
  title            text not null,
  type             text,
  due_date         date,
  status           text not null default 'pendente'
                   check (status in ('pendente','em_producao','em_revisao','enviado_cliente','aprovado','reprovado','publicado')),
  responsible_id   uuid references auth.users(id) on delete set null,
  links            text,
  client_comments  text,
  notes            text,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 5. FINANCEIRO --------------------------------------------------------

create table public.fin_accounts (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  business_id     uuid references public.businesses(id) on delete set null,
  name            text not null,
  type            text not null default 'corrente'
                  check (type in ('corrente','dinheiro','reserva','investimento','carteira_digital','gateway','outro')),
  bank            text,
  initial_balance numeric(14,2) not null default 0,
  color           text,
  archived_at     timestamptz,
  created_at      timestamptz not null default now()
);

create table public.credit_cards (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  business_id   uuid references public.businesses(id) on delete set null,
  name          text not null,
  brand         text,
  last_digits   text check (last_digits ~ '^[0-9]{4}$'),
  credit_limit  numeric(14,2) not null default 0,
  closing_day   int check (closing_day between 1 and 31),
  due_day       int check (due_day between 1 and 31),
  color         text,
  archived_at   timestamptz,
  created_at    timestamptz not null default now()
);

create table public.fin_categories (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  kind         text not null check (kind in ('entrada','saida','ambos')),
  color        text,
  icon         text,
  essential    boolean not null default false,
  unique (workspace_id, name, kind)
);

-- Lançamento único (substitui Financeiro simples + Planilha).
create table public.transactions (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  business_id    uuid references public.businesses(id) on delete set null,
  type           text not null check (type in ('entrada','saida','transferencia')),
  amount         numeric(14,2) not null check (amount > 0),
  date           date not null default current_date,
  description    text not null,
  category_id    uuid references public.fin_categories(id) on delete set null,
  account_id     uuid references public.fin_accounts(id) on delete set null,
  card_id        uuid references public.credit_cards(id) on delete set null,
  to_account_id  uuid references public.fin_accounts(id) on delete set null,  -- transferências
  method         text,                  -- Pix, Cartão, Boleto, Dinheiro...
  status         text not null default 'pago' check (status in ('pago','pendente')),
  essential      boolean not null default false,
  use_type       text not null default 'negocio' check (use_type in ('pessoal','negocio','misto')),
  project_id     uuid references public.projects(id) on delete set null,
  contact_id     uuid references public.contacts(id) on delete set null,
  source_type    text,                  -- sale, receivable, payable, manual
  source_id      uuid,
  notes          text,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (source_type, source_id)       -- uma venda/conta gera no máximo 1 lançamento
);
create index transactions_ws_date_idx on public.transactions (workspace_id, date) where deleted_at is null;

create table public.debts (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  business_id        uuid references public.businesses(id) on delete set null,
  name               text not null,
  creditor           text,
  total_amount       numeric(14,2) not null check (total_amount > 0),
  installments_total int not null default 1 check (installments_total >= 1),
  installment_amount numeric(14,2),
  first_due_date     date,
  interest_rate      numeric(6,3),
  status             text not null default 'ativa'
                     check (status in ('ativa','quitada','atrasada','renegociada','cancelada')),
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.payables (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  business_id        uuid references public.businesses(id) on delete set null,
  title              text not null,
  category_id        uuid references public.fin_categories(id) on delete set null,
  amount             numeric(14,2) not null check (amount > 0),
  due_date           date not null,
  paid_date          date,
  status             text not null default 'pendente'
                     check (status in ('pendente','pago','atrasado','cancelado','parcial')),
  method             text,
  recurrence         text not null default 'none' check (recurrence in ('none','weekly','monthly','yearly')),
  debt_id            uuid references public.debts(id) on delete cascade,
  card_id            uuid references public.credit_cards(id) on delete set null,
  account_id         uuid references public.fin_accounts(id) on delete set null,
  installment_number int,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.receivables (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  business_id    uuid references public.businesses(id) on delete set null,
  contact_id     uuid references public.contacts(id) on delete set null,
  proposal_id    uuid references public.proposals(id) on delete set null,
  title          text not null,
  category_id    uuid references public.fin_categories(id) on delete set null,
  amount         numeric(14,2) not null check (amount > 0),
  expected_date  date not null,
  received_date  date,
  status         text not null default 'previsto'
                 check (status in ('previsto','recebido','atrasado','cancelado','parcial')),
  recurrence     text not null default 'none' check (recurrence in ('none','weekly','monthly','yearly')),
  account_id     uuid references public.fin_accounts(id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.fin_goals (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id  uuid references public.businesses(id) on delete set null,
  name         text not null,
  kind         text not null default 'reserva' check (kind in ('reserva','faturamento','emergencia','independencia')),
  target       numeric(14,2) not null check (target > 0),
  period       text check (period in ('mensal','anual','unico')),
  deadline     date,
  color        text,
  status       text not null default 'ativa' check (status in ('ativa','pausada','concluida')),
  created_at   timestamptz not null default now()
);

create table public.reserves (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  goal_id      uuid references public.fin_goals(id) on delete set null,
  name         text not null,
  amount       numeric(14,2) not null,
  date         date not null default current_date,
  status       text not null default 'ativa' check (status in ('ativa','concluida','arquivada')),
  notes        text,
  created_at   timestamptz not null default now()
);

-- Ofertas = produtos/planos vendidos (SaaS, serviço, infoproduto, acesso VIP do Telegram).
create table public.offers (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  business_id     uuid references public.businesses(id) on delete set null,
  project_id      uuid references public.projects(id) on delete set null,
  name            text not null,
  description     text,
  price           numeric(14,2) not null check (price >= 0),
  billing         text not null default 'unica' check (billing in ('unica','mensal','anual','vitalicio','gratuita')),
  access_days     int,                 -- duração do acesso VIP (null = vitalício)
  vip_group_id    uuid,                -- FK depois
  delivery        jsonb not null default '{}'::jsonb,   -- arquivo/link/mensagem de entrega
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.sales (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  business_id    uuid references public.businesses(id) on delete set null,
  contact_id     uuid references public.contacts(id) on delete set null,
  offer_id       uuid references public.offers(id) on delete set null,
  customer_name  text,
  product_name   text not null,
  amount         numeric(14,2) not null check (amount >= 0),
  method         text not null default 'Pix',
  status         text not null default 'pendente'
                 check (status in ('pendente','pago','atrasado','cancelado','reembolsado','em_negociacao')),
  date           date not null default current_date,
  paid_at        timestamptz,
  channel        text not null default 'manual',      -- manual, telegram, checkout
  payment_id     uuid unique,                          -- FK depois (pagamento do Telegram)
  account_id     uuid references public.fin_accounts(id) on delete set null,
  notes          text,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 6. VENDAS TELEGRAM ---------------------------------------------------

create table public.bots (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  business_id     uuid references public.businesses(id) on delete set null,
  name            text not null,
  username        text,                                -- @SeuBot
  telegram_bot_id bigint unique,
  status          text not null default 'inativo' check (status in ('ativo','inativo','erro')),
  default_flow_id uuid,                                -- FK depois
  last_error      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Segredos ficam em tabelas SEM política RLS: só o service_role (Edge Functions) lê.
create table public.bot_secrets (
  bot_id          uuid primary key references public.bots(id) on delete cascade,
  token           text not null,                       -- token do BotFather (criptografar com Vault)
  webhook_secret  text not null default encode(gen_random_bytes(24), 'hex'),
  updated_at      timestamptz not null default now()
);

create table public.bot_flows (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bot_id       uuid not null references public.bots(id) on delete cascade,
  name         text not null,
  nodes        jsonb not null default '[]'::jsonb,     -- blocos: mensagem, botões, espera, oferta, entrega...
  edges        jsonb not null default '[]'::jsonb,
  is_active    boolean not null default true,
  version      int not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.bots add constraint bots_default_flow_fk
  foreign key (default_flow_id) references public.bot_flows(id) on delete set null;

create table public.bot_leads (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  bot_id           uuid not null references public.bots(id) on delete cascade,
  contact_id       uuid references public.contacts(id) on delete set null,
  telegram_user_id bigint not null,
  chat_id          bigint not null,
  first_name       text,
  last_name        text,
  username         text,
  language_code    text,
  start_param      text,                               -- origem: t.me/Bot?start=xxx
  campaign_id      uuid references public.campaigns(id) on delete set null,
  tags             text[] not null default '{}',
  is_blocked       boolean not null default false,     -- lead bloqueou o bot
  total_spent      numeric(14,2) not null default 0,
  first_seen_at    timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  unique (bot_id, telegram_user_id)
);
create index bot_leads_ws_idx on public.bot_leads (workspace_id, last_seen_at desc);

-- Em que ponto do fluxo cada lead está.
create table public.bot_sessions (
  lead_id        uuid primary key references public.bot_leads(id) on delete cascade,
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  flow_id        uuid references public.bot_flows(id) on delete set null,
  current_node   text,
  vars           jsonb not null default '{}'::jsonb,
  waiting_until  timestamptz,                          -- bloco "Espera"
  updated_at     timestamptz not null default now()
);
create index bot_sessions_wait_idx on public.bot_sessions (waiting_until) where waiting_until is not null;

-- Histórico da conversa (para "abrir a conversa" do lead).
create table public.bot_messages (
  id                  bigint generated always as identity primary key,
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  lead_id             uuid not null references public.bot_leads(id) on delete cascade,
  direction           text not null check (direction in ('in','out')),
  kind                text not null default 'text',    -- text, photo, video, document, callback
  text                text,
  payload             jsonb,
  telegram_message_id bigint,
  at                  timestamptz not null default now()
);
create index bot_messages_lead_idx on public.bot_messages (lead_id, at);

create table public.vip_groups (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bot_id       uuid not null references public.bots(id) on delete cascade,
  chat_id      bigint not null,
  title        text not null,
  kind         text not null default 'grupo' check (kind in ('grupo','canal')),
  created_at   timestamptz not null default now(),
  unique (bot_id, chat_id)
);
alter table public.offers add constraint offers_vip_group_fk
  foreign key (vip_group_id) references public.vip_groups(id) on delete set null;

create table public.gateways (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  provider      text not null,                         -- pushinpay, mercadopago, efi, asaas...
  name          text not null,
  priority      int not null default 1,                -- ordem de fallback
  active        boolean not null default true,
  fee_fixed     numeric(10,2) not null default 0,      -- para calcular lucro líquido
  fee_percent   numeric(6,3) not null default 0,
  account_id    uuid references public.fin_accounts(id) on delete set null,
  last_error    text,
  created_at    timestamptz not null default now()
);

create table public.gateway_secrets (
  gateway_id   uuid primary key references public.gateways(id) on delete cascade,
  credentials  jsonb not null,                         -- chaves de API (criptografar com Vault)
  updated_at   timestamptz not null default now()
);

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  bot_id        uuid references public.bots(id) on delete set null,
  lead_id       uuid references public.bot_leads(id) on delete set null,
  offer_id      uuid references public.offers(id) on delete set null,
  gateway_id    uuid not null references public.gateways(id),
  external_id   text not null,                         -- id da cobrança no gateway
  amount        numeric(14,2) not null check (amount > 0),
  fee           numeric(14,2),
  status        text not null default 'gerado'
                check (status in ('gerado','pago','expirado','cancelado','reembolsado','falhou')),
  pix_code      text,                                  -- copia e cola
  expires_at    timestamptz,
  paid_at       timestamptz,
  raw           jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (gateway_id, external_id)                     -- idempotência: 1 cobrança = 1 linha
);
create index payments_ws_status_idx on public.payments (workspace_id, status, created_at desc);
alter table public.sales add constraint sales_payment_fk
  foreign key (payment_id) references public.payments(id) on delete set null;

create table public.subscriptions (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id      uuid not null references public.bot_leads(id) on delete cascade,
  offer_id     uuid references public.offers(id) on delete set null,
  vip_group_id uuid references public.vip_groups(id) on delete set null,
  payment_id   uuid references public.payments(id) on delete set null,
  status       text not null default 'ativa' check (status in ('ativa','expirada','cancelada','removido')),
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz,                            -- null = vitalício
  invite_link  text,
  warned_at    timestamptz,                            -- aviso de vencimento enviado
  removed_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index subscriptions_expiring_idx on public.subscriptions (ends_at) where status = 'ativa';

-- Base de todas as métricas do dashboard de vendas.
create type public.bot_event_type as enum (
  'start','mensagem','clique','pix_gerado','pix_pago','pix_expirado',
  'entregue','vip_entrou','vip_removido','remarketing_enviado','bloqueou','upsell_aceito','downsell_aceito'
);

create table public.bot_events (
  id           bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bot_id       uuid not null references public.bots(id) on delete cascade,
  lead_id      uuid references public.bot_leads(id) on delete set null,
  type         public.bot_event_type not null,
  offer_id     uuid references public.offers(id) on delete set null,
  payment_id   uuid references public.payments(id) on delete set null,
  amount       numeric(14,2),
  meta         jsonb not null default '{}'::jsonb,
  at           timestamptz not null default now()
);
create index bot_events_metrics_idx on public.bot_events (workspace_id, bot_id, type, at);
create index bot_events_recent_idx  on public.bot_events (workspace_id, at desc);

create table public.remarketing_campaigns (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  bot_id        uuid not null references public.bots(id) on delete cascade,
  name          text not null,
  audience      jsonb not null default '{}'::jsonb,    -- ex.: {"gerou_pix_sem_pagar": true, "tags": ["x"]}
  message       jsonb not null,                        -- texto, mídia, botões, oferta
  trigger_type  text not null default 'manual' check (trigger_type in ('manual','agendado','automatico')),
  delay_minutes int,                                   -- automático: X min após o evento
  scheduled_at  timestamptz,
  status        text not null default 'rascunho' check (status in ('rascunho','agendado','enviando','concluido','pausado')),
  sent_count    int not null default 0,
  created_at    timestamptz not null default now()
);

create table public.remarketing_sends (
  campaign_id  uuid not null references public.remarketing_campaigns(id) on delete cascade,
  lead_id      uuid not null references public.bot_leads(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  status       text not null default 'pendente' check (status in ('pendente','enviado','falhou','convertido')),
  sent_at      timestamptz,
  primary key (campaign_id, lead_id)
);

-- Links de rastreio (redirecionador com UTM / ?start=). Sem cloaking.
create table public.tracking_links (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bot_id       uuid references public.bots(id) on delete cascade,
  campaign_id  uuid references public.campaigns(id) on delete set null,
  slug         text not null unique,
  start_param  text not null,
  utm          jsonb not null default '{}'::jsonb,
  clicks       int not null default 0,
  created_at   timestamptz not null default now()
);

-- 7. AUTOMAÇÕES (TRIGGERS) ---------------------------------------------

-- updated_at em todas as tabelas que têm a coluna.
do $$
declare t text;
begin
  for t in
    select c.table_name from information_schema.columns c
    join information_schema.tables tb on tb.table_name = c.table_name and tb.table_schema = c.table_schema
    where c.table_schema = 'public' and c.column_name = 'updated_at' and tb.table_type = 'BASE TABLE'
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
                   t || '_updated_at', t);
  end loop;
end $$;

-- 7.1 Tarefa concluída registra data; reaberta limpa.
create or replace function public.tasks_completed_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'concluida' and (old.status is distinct from 'concluida') then
    new.completed_at := now();
  elsif new.status <> 'concluida' then
    new.completed_at := null;
  end if;
  return new;
end $$;
create trigger tasks_completed_at before update of status on public.tasks
  for each row execute function public.tasks_completed_at();

-- 7.2 Tarefa recorrente concluída cria a próxima ocorrência.
create or replace function public.tasks_spawn_recurrence()
returns trigger language plpgsql as $$
declare next_due date;
begin
  if new.status = 'concluida' and old.status <> 'concluida' and new.recurrence <> 'none' then
    next_due := coalesce(new.due_date, current_date);
    next_due := case new.recurrence
      when 'daily'    then next_due + 1
      when 'weekdays' then next_due + case extract(isodow from next_due) when 5 then 3 when 6 then 2 else 1 end
      when 'weekly'   then next_due + 7
      when 'monthly'  then (next_due + interval '1 month')::date
      when 'yearly'   then (next_due + interval '1 year')::date
    end;
    insert into public.tasks (workspace_id, business_id, list_id, flow_id, project_id, goal_id, contact_id,
                              title, notes, priority, tags, is_important, due_date, recurrence, assignee_id, created_by)
    values (new.workspace_id, new.business_id, new.list_id, new.flow_id, new.project_id, new.goal_id, new.contact_id,
            new.title, new.notes, new.priority, new.tags, new.is_important, next_due, new.recurrence, new.assignee_id, new.created_by);
  end if;
  return new;
end $$;
create trigger tasks_spawn_recurrence after update of status on public.tasks
  for each row execute function public.tasks_spawn_recurrence();

-- 7.3 Mover oportunidade de etapa atualiza status do contato e da oportunidade.
create or replace function public.deals_stage_effects()
returns trigger language plpgsql as $$
declare st public.pipeline_stages%rowtype;
begin
  select * into st from public.pipeline_stages where id = new.stage_id;
  new.status := st.outcome;
  if st.outcome in ('won','lost') and new.closed_at is null then new.closed_at := now(); end if;
  if st.outcome = 'open' then new.closed_at := null; end if;
  if st.set_contact_status is not null then
    update public.contacts set status = st.set_contact_status where id = new.contact_id;
  end if;
  return new;
end $$;
create trigger deals_stage_effects before insert or update of stage_id on public.deals
  for each row execute function public.deals_stage_effects();

-- 7.4 Proposta aprovada: contato vira cliente ativo e gera mensalidade + setup a receber.
create or replace function public.proposals_on_approve()
returns trigger language plpgsql as $$
declare first_due date;
begin
  if new.status = 'aprovada' and (tg_op = 'INSERT' or old.status is distinct from 'aprovada') then
    new.approved_at := coalesce(new.approved_at, now());
    update public.contacts
       set status = 'cliente_ativo',
           monthly_value = new.monthly_value,
           start_date = coalesce(start_date, current_date)
     where id = new.contact_id;

    first_due := make_date(extract(year from current_date)::int, extract(month from current_date)::int,
                           coalesce(new.billing_day, least(extract(day from current_date)::int, 28)));
    if first_due < current_date then first_due := (first_due + interval '1 month')::date; end if;

    if new.monthly_value > 0 then
      insert into public.receivables (workspace_id, business_id, contact_id, proposal_id, title, amount, expected_date, recurrence)
      values (new.workspace_id, new.business_id, new.contact_id, new.id, 'Mensalidade — ' || new.title,
              new.monthly_value, first_due, 'monthly');
    end if;
    if new.setup_fee > 0 then
      insert into public.receivables (workspace_id, business_id, contact_id, proposal_id, title, amount, expected_date)
      values (new.workspace_id, new.business_id, new.contact_id, new.id, 'Setup — ' || new.title,
              new.setup_fee, current_date);
    end if;
  end if;
  if new.status = 'enviada' and new.sent_at is null then new.sent_at := now(); end if;
  return new;
end $$;
create trigger proposals_on_approve before insert or update of status on public.proposals
  for each row execute function public.proposals_on_approve();

-- 7.5 Venda paga vira lançamento de entrada (idempotente via unique source).
create or replace function public.sales_to_transaction()
returns trigger language plpgsql as $$
begin
  if new.status = 'pago' and (tg_op = 'INSERT' or old.status is distinct from 'pago') then
    if new.paid_at is null then new.paid_at := now(); end if;
    insert into public.transactions (workspace_id, business_id, type, amount, date, description, method,
                                     account_id, contact_id, source_type, source_id)
    values (new.workspace_id, new.business_id, 'entrada', new.amount, new.paid_at::date,
            'Venda — ' || new.product_name, new.method, new.account_id, new.contact_id, 'sale', new.id)
    on conflict (source_type, source_id) do nothing;
  elsif tg_op = 'UPDATE' and old.status = 'pago' then
    -- reembolso/cancelamento remove a entrada gerada
    delete from public.transactions where source_type = 'sale' and source_id = new.id;
  end if;
  return new;
end $$;
create trigger sales_to_transaction before insert or update of status on public.sales
  for each row execute function public.sales_to_transaction();

-- 7.6 Conta a receber recebida vira entrada; recorrente gera a próxima.
create or replace function public.receivables_on_receive()
returns trigger language plpgsql as $$
begin
  if new.status = 'recebido' and old.status is distinct from 'recebido' then
    new.received_date := coalesce(new.received_date, current_date);
    insert into public.transactions (workspace_id, business_id, type, amount, date, description,
                                     account_id, contact_id, category_id, source_type, source_id)
    values (new.workspace_id, new.business_id, 'entrada', new.amount, new.received_date, new.title,
            new.account_id, new.contact_id, new.category_id, 'receivable', new.id)
    on conflict (source_type, source_id) do nothing;
    if new.recurrence <> 'none' then
      insert into public.receivables (workspace_id, business_id, contact_id, proposal_id, title, category_id,
                                      amount, expected_date, recurrence, account_id)
      values (new.workspace_id, new.business_id, new.contact_id, new.proposal_id, new.title, new.category_id,
              new.amount,
              (new.expected_date + case new.recurrence when 'weekly' then interval '7 days'
                                                       when 'monthly' then interval '1 month'
                                                       else interval '1 year' end)::date,
              new.recurrence, new.account_id);
    end if;
  end if;
  return new;
end $$;
create trigger receivables_on_receive before update of status on public.receivables
  for each row execute function public.receivables_on_receive();

-- 7.7 Conta a pagar paga vira saída; recorrente gera a próxima.
create or replace function public.payables_on_pay()
returns trigger language plpgsql as $$
begin
  if new.status = 'pago' and old.status is distinct from 'pago' then
    new.paid_date := coalesce(new.paid_date, current_date);
    insert into public.transactions (workspace_id, business_id, type, amount, date, description, method,
                                     account_id, card_id, category_id, source_type, source_id)
    values (new.workspace_id, new.business_id, 'saida', new.amount, new.paid_date, new.title, new.method,
            new.account_id, new.card_id, new.category_id, 'payable', new.id)
    on conflict (source_type, source_id) do nothing;
    if new.recurrence <> 'none' then
      insert into public.payables (workspace_id, business_id, title, category_id, amount, due_date,
                                   method, recurrence, card_id, account_id)
      values (new.workspace_id, new.business_id, new.title, new.category_id, new.amount,
              (new.due_date + case new.recurrence when 'weekly' then interval '7 days'
                                                  when 'monthly' then interval '1 month'
                                                  else interval '1 year' end)::date,
              new.method, new.recurrence, new.card_id, new.account_id);
    end if;
  end if;
  return new;
end $$;
create trigger payables_on_pay before update of status on public.payables
  for each row execute function public.payables_on_pay();

-- 7.8 Dívida criada gera as parcelas em contas a pagar.
create or replace function public.debts_generate_installments()
returns trigger language plpgsql as $$
declare i int; val numeric(14,2);
begin
  val := coalesce(new.installment_amount, round(new.total_amount / new.installments_total, 2));
  for i in 1..new.installments_total loop
    insert into public.payables (workspace_id, business_id, title, amount, due_date, debt_id, installment_number)
    values (new.workspace_id, new.business_id,
            new.name || ' (' || i || '/' || new.installments_total || ')', val,
            (coalesce(new.first_due_date, current_date) + ((i - 1) || ' months')::interval)::date,
            new.id, i);
  end loop;
  return new;
end $$;
create trigger debts_generate_installments after insert on public.debts
  for each row execute function public.debts_generate_installments();

-- 7.9 Pagamento do Telegram confirmado: evento + venda + total gasto do lead.
--     (A entrega no Telegram e o convite VIP são feitos pela Edge Function.)
create or replace function public.payments_on_paid()
returns trigger language plpgsql as $$
declare v_offer public.offers%rowtype; v_lead public.bot_leads%rowtype; v_gw public.gateways%rowtype;
begin
  if new.status = 'pago' and old.status is distinct from 'pago' then
    new.paid_at := coalesce(new.paid_at, now());
    select * into v_offer from public.offers where id = new.offer_id;
    select * into v_lead  from public.bot_leads where id = new.lead_id;
    select * into v_gw    from public.gateways where id = new.gateway_id;
    new.fee := coalesce(new.fee, round(v_gw.fee_fixed + new.amount * v_gw.fee_percent / 100, 2));

    insert into public.bot_events (workspace_id, bot_id, lead_id, type, offer_id, payment_id, amount)
    values (new.workspace_id, new.bot_id, new.lead_id, 'pix_pago', new.offer_id, new.id, new.amount);

    insert into public.sales (workspace_id, business_id, contact_id, offer_id, customer_name, product_name,
                              amount, method, status, paid_at, channel, payment_id, account_id)
    values (new.workspace_id, v_offer.business_id, v_lead.contact_id, new.offer_id,
            trim(coalesce(v_lead.first_name,'') || ' ' || coalesce(v_lead.last_name,'')),
            coalesce(v_offer.name, 'Venda Telegram'), new.amount, 'Pix', 'pago', new.paid_at,
            'telegram', new.id, v_gw.account_id)
    on conflict (payment_id) do nothing;

    update public.bot_leads set total_spent = total_spent + new.amount where id = new.lead_id;
  elsif new.status = 'expirado' and old.status = 'gerado' then
    insert into public.bot_events (workspace_id, bot_id, lead_id, type, offer_id, payment_id, amount)
    values (new.workspace_id, new.bot_id, new.lead_id, 'pix_expirado', new.offer_id, new.id, new.amount);
  end if;
  return new;
end $$;
create trigger payments_on_paid before update of status on public.payments
  for each row execute function public.payments_on_paid();

-- Pix gerado registra o evento automaticamente.
create or replace function public.payments_on_create()
returns trigger language plpgsql as $$
begin
  insert into public.bot_events (workspace_id, bot_id, lead_id, type, offer_id, payment_id, amount)
  values (new.workspace_id, new.bot_id, new.lead_id, 'pix_gerado', new.offer_id, new.id, new.amount);
  return new;
end $$;
create trigger payments_on_create after insert on public.payments
  for each row when (new.bot_id is not null) execute function public.payments_on_create();

-- 8. VIEWS DE MÉTRICAS -------------------------------------------------
-- security_invoker = a view respeita o RLS de quem consulta.

-- Dashboard de vendas do Telegram, por dia e por robô.
create view public.v_bot_daily_metrics with (security_invoker = true) as
select
  e.workspace_id,
  e.bot_id,
  (e.at at time zone 'America/Sao_Paulo')::date                    as day,
  count(*) filter (where e.type = 'start')                         as starts,
  count(*) filter (where e.type = 'pix_gerado')                    as pix_gerados,
  count(*) filter (where e.type = 'pix_pago')                      as pix_pagos,
  coalesce(sum(e.amount) filter (where e.type = 'pix_pago'), 0)    as faturamento,
  case when count(*) filter (where e.type = 'pix_gerado') > 0
       then round(100.0 * count(*) filter (where e.type = 'pix_pago')
                  / count(*) filter (where e.type = 'pix_gerado'), 2) end as conversao_pix_pct,
  case when count(*) filter (where e.type = 'pix_pago') > 0
       then round(coalesce(sum(e.amount) filter (where e.type = 'pix_pago'), 0)
                  / count(*) filter (where e.type = 'pix_pago'), 2) end  as ticket_medio,
  case when count(*) filter (where e.type = 'pix_pago') > 0
       then round(count(*) filter (where e.type = 'start')::numeric
                  / count(*) filter (where e.type = 'pix_pago'), 1) end   as starts_por_venda
from public.bot_events e
group by 1, 2, 3;

-- Desempenho por origem (?start=) para saber qual campanha vende.
create view public.v_bot_source_metrics with (security_invoker = true) as
select
  l.workspace_id, l.bot_id, coalesce(l.start_param, '(direto)') as origem,
  count(distinct l.id)                                          as leads,
  count(distinct p.id) filter (where p.status = 'pago')         as vendas,
  coalesce(sum(p.amount) filter (where p.status = 'pago'), 0)   as faturamento
from public.bot_leads l
left join public.payments p on p.lead_id = l.id
group by 1, 2, 3;

-- Resumo financeiro mensal por negócio (Pessoal, RG Marketing, Telegram...).
create view public.v_finance_monthly with (security_invoker = true) as
select
  t.workspace_id, t.business_id,
  date_trunc('month', t.date)::date                                 as month,
  coalesce(sum(t.amount) filter (where t.type = 'entrada'), 0)      as entradas,
  coalesce(sum(t.amount) filter (where t.type = 'saida'), 0)        as saidas,
  coalesce(sum(case t.type when 'entrada' then t.amount when 'saida' then -t.amount else 0 end), 0) as saldo
from public.transactions t
where t.deleted_at is null and t.status = 'pago'
group by 1, 2, 3;

-- KPIs da agência (substitui o AgenciaDashboard calculado no navegador).
create view public.v_agency_kpis with (security_invoker = true) as
select
  w.id as workspace_id,
  (select count(*) from public.contacts c where c.workspace_id = w.id and c.deleted_at is null and c.status = 'cliente_ativo') as clientes_ativos,
  (select count(*) from public.contacts c where c.workspace_id = w.id and c.deleted_at is null and c.status = 'lead')          as leads,
  (select coalesce(sum(c.monthly_value), 0) from public.contacts c where c.workspace_id = w.id and c.deleted_at is null and c.status = 'cliente_ativo') as receita_recorrente,
  (select count(*) from public.proposals p where p.workspace_id = w.id and p.deleted_at is null and p.status in ('enviada','em_negociacao')) as propostas_em_aberto,
  (select count(*) from public.proposals p where p.workspace_id = w.id and p.deleted_at is null and p.status = 'aprovada'
                                           and p.approved_at >= date_trunc('month', now())) as propostas_aprovadas_mes,
  (select coalesce(sum(t.amount), 0) from public.transactions t where t.workspace_id = w.id and t.deleted_at is null
                                           and t.type = 'entrada' and t.date >= date_trunc('month', now())) as receita_recebida_mes,
  (select count(*) from public.deliveries d where d.workspace_id = w.id and d.deleted_at is null
                                           and d.due_date < current_date and d.status not in ('aprovado','publicado')) as entregas_atrasadas,
  (select count(*) from public.campaigns k where k.workspace_id = w.id and k.deleted_at is null and k.status = 'ativa') as campanhas_ativas,
  (select count(*) from public.content_items ci where ci.workspace_id = w.id and ci.deleted_at is null and ci.stage = 'revisao') as conteudos_em_aprovacao,
  (select count(*) from public.activities a where a.workspace_id = w.id and a.type = 'reuniao'
                                           and a.at >= date_trunc('week', now()) and a.at < date_trunc('week', now()) + interval '7 days') as reunioes_semana
from public.workspaces w;

-- 9. RLS ---------------------------------------------------------------

alter table public.profiles enable row level security;
create policy profiles_self on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_coworkers on public.profiles for select
  using (exists (select 1 from public.workspace_members a
                 join public.workspace_members b on a.workspace_id = b.workspace_id
                 where a.user_id = auth.uid() and b.user_id = profiles.id));

alter table public.workspaces enable row level security;
create policy ws_select on public.workspaces for select using (public.is_member(id));
create policy ws_update on public.workspaces for update using (owner_id = auth.uid());

alter table public.workspace_members enable row level security;
create policy wm_select on public.workspace_members for select using (public.is_member(workspace_id));
create policy wm_manage on public.workspace_members for all
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));

-- Todas as tabelas com workspace_id: membros leem; quem não é "viewer" escreve.
-- bot_secrets e gateway_secrets NÃO entram aqui: RLS ligado sem política = só service_role.
do $$
declare t text;
begin
  for t in
    select c.table_name from information_schema.columns c
    join information_schema.tables tb on tb.table_name = c.table_name and tb.table_schema = c.table_schema
    where c.table_schema = 'public' and c.column_name = 'workspace_id' and tb.table_type = 'BASE TABLE'
      and c.table_name not in ('workspace_members','prospect_niches')
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select using (public.is_member(workspace_id))', t || '_read', t);
    execute format('create policy %I on public.%I for insert with check (public.can_write(workspace_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update using (public.can_write(workspace_id)) with check (public.can_write(workspace_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete using (public.can_write(workspace_id))', t || '_delete', t);
  end loop;
end $$;

-- Nichos: globais (workspace_id null) são de leitura para todos os logados.
alter table public.prospect_niches enable row level security;
create policy niches_read  on public.prospect_niches for select using (workspace_id is null or public.is_member(workspace_id));
create policy niches_write on public.prospect_niches for all
  using (workspace_id is not null and public.can_write(workspace_id))
  with check (workspace_id is not null and public.can_write(workspace_id));

alter table public.bot_secrets     enable row level security;
alter table public.gateway_secrets enable row level security;

-- 10. ONBOARDING AUTOMÁTICO ---------------------------------------------
-- Novo usuário ganha: perfil, workspace, negócio "Pessoal", fluxos padrão,
-- lista de tarefas, pipeline da agência, categorias financeiras.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare ws uuid; pl uuid; f text; i int := 0;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));

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
    (ws, pl, 'Perdido',          6, 'lost', 'perdido');

  insert into public.fin_categories (workspace_id, name, kind, essential) values
    (ws, 'Vendas', 'entrada', false), (ws, 'Serviços', 'entrada', false), (ws, 'Salário / Pró-labore', 'entrada', false),
    (ws, 'Moradia', 'saida', true), (ws, 'Alimentação', 'saida', true), (ws, 'Transporte', 'saida', true),
    (ws, 'Saúde', 'saida', true), (ws, 'Ferramentas / SaaS', 'saida', false), (ws, 'Tráfego pago', 'saida', false),
    (ws, 'Taxas de gateway', 'saida', false), (ws, 'Lazer', 'saida', false), (ws, 'Impostos', 'saida', true);

  insert into public.services (workspace_id, name, recurring) values
    (ws, 'Gestão de tráfego', true), (ws, 'Social media', true), (ws, 'Edição de vídeo', true),
    (ws, 'Design', true), (ws, 'Copywriting', true), (ws, 'Landing page', false),
    (ws, 'Site institucional', false), (ws, 'Identidade visual', false), (ws, 'Consultoria', false),
    (ws, 'Funil de vendas', false), (ws, 'Automação', false), (ws, 'CRM', false);

  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 11. FUNÇÕES PARA JOBS AGENDADOS ---------------------------------------
-- Agendamento (pg_cron) fica em 03b_jobs_pg_cron.sql.

-- Marca atrasados (contas, recebíveis) e expira PIX vencidos.
create or replace function public.job_mark_overdue()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.payables    set status = 'atrasado' where status = 'pendente' and due_date < current_date;
  update public.receivables set status = 'atrasado' where status = 'previsto' and expected_date < current_date;
  update public.payments    set status = 'expirado' where status = 'gerado' and expires_at < now();
end $$;

-- Lixeira: apaga de vez o que foi excluído há mais de 30 dias.
create or replace function public.job_purge_trash()
returns void language plpgsql security definer set search_path = public as $$
declare t text;
begin
  for t in
    select c.table_name from information_schema.columns c
    join information_schema.tables tb on tb.table_name = c.table_name and tb.table_schema = c.table_schema
    where c.table_schema = 'public' and c.column_name = 'deleted_at' and tb.table_type = 'BASE TABLE'
  loop
    execute format('delete from public.%I where deleted_at < now() - interval ''30 days''', t);
  end loop;
end $$;

-- Assinaturas VIP vencidas: marca como expirada (a Edge Function remove do grupo).
create or replace function public.job_expire_subscriptions()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.subscriptions set status = 'expirada'
   where status = 'ativa' and ends_at is not null and ends_at < now();
  get diagnostics n = row_count;
  return n;
end $$;
