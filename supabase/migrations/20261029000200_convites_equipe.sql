-- =====================================================================
-- Equipe: convites por e-mail + lista de membros
-- - Dono convida um e-mail com um papel (admin, member, viewer).
-- - Se a pessoa JÁ tem conta: entra no workspace na hora.
-- - Se ainda não tem: quando criar a conta com esse e-mail, entra
--   direto no workspace de quem convidou (sem criar um workspace próprio).
-- =====================================================================

create table public.workspace_invites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email        text not null check (email = lower(trim(email)) and email like '%@%'),
  role         public.member_role not null default 'member' check (role <> 'owner'),
  invited_by   uuid references auth.users(id) on delete set null default auth.uid(),
  accepted_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (workspace_id, email)
);

alter table public.workspace_invites enable row level security;
create policy invites_read on public.workspace_invites for select using (public.is_member(workspace_id));
create policy invites_owner on public.workspace_invites for all
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));

-- Convidar (só o dono). Retorna 'adicionado' (já tinha conta) ou 'convidado'.
create or replace function public.invite_member(_ws uuid, _email text, _role public.member_role default 'member')
returns text language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(_email)); v_user uuid;
begin
  if not exists (select 1 from public.workspaces where id = _ws and owner_id = auth.uid()) then
    raise exception 'Só o dono do workspace pode convidar.';
  end if;
  if _role = 'owner' then raise exception 'Papel inválido.'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido.'; end if;

  select id into v_user from auth.users where lower(email) = v_email;
  if v_user = auth.uid() then raise exception 'Você já é o dono deste workspace.'; end if;

  if v_user is not null then
    insert into public.workspace_members (workspace_id, user_id, role) values (_ws, v_user, _role)
    on conflict (workspace_id, user_id) do update set role = excluded.role;
    insert into public.workspace_invites (workspace_id, email, role, accepted_at) values (_ws, v_email, _role, now())
    on conflict (workspace_id, email) do update set role = excluded.role, accepted_at = now();
    return 'adicionado';
  end if;

  insert into public.workspace_invites (workspace_id, email, role) values (_ws, v_email, _role)
  on conflict (workspace_id, email) do update set role = excluded.role, accepted_at = null;
  return 'convidado';
end $$;

-- Lista os membros com nome e e-mail (só para quem é membro).
create or replace function public.list_members(_ws uuid)
returns table (user_id uuid, full_name text, email text, role public.member_role, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.full_name, u.email::text, m.role, m.created_at
  from public.workspace_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.workspace_id = _ws and public.is_member(_ws)
  order by (m.role = 'owner') desc, m.created_at;
$$;

revoke execute on function public.invite_member(uuid, text, public.member_role) from public, anon;
revoke execute on function public.list_members(uuid) from public, anon;
grant execute on function public.invite_member(uuid, text, public.member_role) to authenticated;
grant execute on function public.list_members(uuid) to authenticated;

-- Onboarding: se havia convite para o e-mail, entra no workspace de quem convidou.
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
revoke execute on function public.handle_new_user() from public, anon, authenticated;
