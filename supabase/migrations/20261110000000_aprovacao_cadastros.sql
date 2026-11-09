-- Cadastro aberto com aprovação: quem se cadastra sozinho fica "pendente" até o administrador liberar.
-- Quem entra por convite (link ou e-mail) já é aprovado, porque o convite já é a sua autorização.

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
drop policy if exists app_admins_self on public.app_admins;
create policy app_admins_self on public.app_admins for select using (user_id = auth.uid());

-- O primeiro usuário do sistema (dono original) vira administrador.
insert into public.app_admins (user_id)
select id from auth.users order by created_at limit 1
on conflict do nothing;

alter table public.profiles add column if not exists approval text not null default 'pending'
  check (approval in ('pending', 'approved', 'rejected'));
alter table public.profiles add column if not exists approved_at timestamptz;
-- Quem já existe continua entrando normalmente.
update public.profiles set approval = 'approved', approved_at = coalesce(approved_at, now()) where approval = 'pending';

create or replace function public.is_app_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid()) $$;

/** Situação da conta logada: approved / pending / rejected. */
create or replace function public.my_approval() returns text
language sql stable security definer set search_path = public as $$
  select case when public.is_app_admin() then 'approved'
              else coalesce((select approval from public.profiles where id = auth.uid()), 'pending') end $$;

-- Ninguém muda a própria aprovação pelo perfil.
create or replace function public.profiles_keep_approval() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.approval := old.approval;
    new.approved_at := old.approved_at;
  end if;
  return new;
end $$;
drop trigger if exists profiles_keep_approval on public.profiles;
create trigger profiles_keep_approval before update on public.profiles for each row execute function public.profiles_keep_approval();

create or replace function public.list_signups()
returns table (user_id uuid, full_name text, email text, approval text, created_at timestamptz, via_invite boolean)
language sql stable security definer set search_path = public as $$
  select u.id, p.full_name, u.email::text, coalesce(p.approval, 'pending'), u.created_at,
         exists (select 1 from public.workspace_invites i where i.accepted_by = u.id)
  from auth.users u left join public.profiles p on p.id = u.id
  where public.is_app_admin()
  order by (coalesce(p.approval, 'pending') = 'pending') desc, u.created_at desc
  limit 200 $$;

create or replace function public.set_approval(_user uuid, _status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'Só o administrador do Superflow aprova cadastros.'; end if;
  if _status not in ('approved', 'rejected', 'pending') then raise exception 'Situação inválida.'; end if;
  if _user = auth.uid() then raise exception 'Você não pode mudar a sua própria conta.'; end if;
  update public.profiles set approval = _status, approved_at = case when _status = 'approved' then now() else null end where id = _user;
end $$;

-- Convite aceito = aprovado.
create or replace function public.approve_by_invite(_user uuid) returns void
language sql security definer set search_path = public as $$
  update public.profiles set approval = 'approved', approved_at = coalesce(approved_at, now())
  where id = _user and approval = 'pending' $$;
revoke execute on function public.approve_by_invite(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare ws uuid; inv record; invited boolean := false;
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
    invited := true;
  end loop;
  -- Primeiro usuário do sistema, ou convidado por e-mail: entra direto.
  if invited or not exists (select 1 from auth.users where id <> new.id) then perform public.approve_by_invite(new.id); end if;
  return new;
end $$;

create or replace function public.accept_invite(_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv record; my_email text;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para aceitar o convite.'; end if;
  select * into inv from public.workspace_invites where token = _token for update;
  if not found then raise exception 'Convite não encontrado.'; end if;
  if exists (select 1 from public.workspace_members where workspace_id = inv.workspace_id and user_id = auth.uid()) then
    perform public.approve_by_invite(auth.uid());
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
  perform public.approve_by_invite(auth.uid());
  perform public.log_team_event(inv.workspace_id, 'entrou na equipe', my_email);
  return inv.workspace_id;
end $$;

-- Conta pendente ou recusada não cria equipe nem convida.
create or replace function public.create_team(_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare ws uuid; n text := nullif(trim(_name), '');
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
  if public.my_approval() <> 'approved' then raise exception 'Sua conta ainda não foi liberada.'; end if;
  if n is null then raise exception 'Dê um nome para a equipe.'; end if;
  insert into public.workspaces (name, owner_id, kind) values (left(n, 80), auth.uid(), 'equipe') returning id into ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws, auth.uid(), 'owner');
  perform public.seed_workspace(ws, left(n, 80), 'agencia');
  perform public.log_team_event(ws, 'criou a equipe', n);
  return ws;
end $$;

revoke execute on function public.list_signups() from public, anon;
revoke execute on function public.set_approval(uuid, text) from public, anon;
revoke execute on function public.my_approval() from public, anon;
revoke execute on function public.is_app_admin() from public, anon;
grant execute on function public.list_signups(), public.set_approval(uuid, text), public.my_approval(), public.is_app_admin() to authenticated;
revoke execute on function public.create_team(text) from public, anon;
grant execute on function public.create_team(text) to authenticated;
revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;
