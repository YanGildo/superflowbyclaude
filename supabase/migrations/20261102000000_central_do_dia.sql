-- Central do dia (assistente): compromissos, rascunhos com aprovação e resumos das varreduras.
-- Regra de ouro: o sistema PREPARA (rascunho), nunca ENVIA. Tudo espera a aprovação do usuário.

-- 1. Agenda própria (depois sincroniza com o Google Agenda na fase de Integrações) ----------------
create table public.appointments (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id  uuid references public.businesses(id) on delete set null,
  contact_id   uuid references public.contacts(id) on delete set null,
  title        text not null check (length(trim(title)) > 0),
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  location     text,
  link         text,
  notes        text,
  source       text not null default 'manual',   -- manual | google (futuro)
  external_id  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index appointments_ws_start_idx on public.appointments (workspace_id, starts_at);
create trigger appointments_updated_at before update on public.appointments for each row execute function public.set_updated_at();

-- 2. Rascunhos esperando aprovação -----------------------------------------------------------------
create table public.assistant_drafts (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id  uuid references public.businesses(id) on delete set null,
  contact_id   uuid references public.contacts(id) on delete cascade,
  source_type  text not null check (source_type in ('followup','proposta')),
  source_id    uuid not null,
  channel      text not null default 'whatsapp',
  title        text not null,
  body         text not null,
  status       text not null default 'pendente' check (status in ('pendente','aprovado','descartado')),
  decided_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index assistant_drafts_ws_idx on public.assistant_drafts (workspace_id, status, created_at desc);
-- No máximo um rascunho pendente por origem (a varredura não duplica).
create unique index assistant_drafts_pending_uidx on public.assistant_drafts (source_type, source_id) where status = 'pendente';

-- 3. Resumo de cada varredura ----------------------------------------------------------------------
create table public.assistant_digests (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  slot         text not null,                    -- '07', '13', '18' (hora da varredura) ou 'manual'
  counts       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index assistant_digests_ws_idx on public.assistant_digests (workspace_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['appointments','assistant_drafts','assistant_digests'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select using (public.is_member(workspace_id))', t || '_read', t);
    execute format('create policy %I on public.%I for insert with check (public.can_write(workspace_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update using (public.can_write(workspace_id)) with check (public.can_write(workspace_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete using (public.can_write(workspace_id))', t || '_delete', t);
  end loop;
end $$;

-- 4. Varredura --------------------------------------------------------------------------------------
-- Modelos padrão (o usuário troca em Configurações → Assistente). [nome] e [proposta] viram os dados reais.
create or replace function public.assistant_template(ws_settings jsonb, kind text)
returns text language sql immutable as $$
  select coalesce(nullif(ws_settings #>> array['assistente','modelos',kind], ''),
    case kind
      when 'followup' then 'Oi [nome], tudo bem? Passando para dar continuidade à nossa conversa. Consegue falar hoje?'
      else 'Oi [nome], tudo bem? Conseguiu dar uma olhada na proposta "[proposta]"? Fico à disposição para ajustar o que precisar.'
    end)
$$;

create or replace function public.assistant_first_name(c public.contacts)
returns text language sql immutable as $$
  select split_part(trim(coalesce(nullif(c.contact_person, ''), c.name)), ' ', 1)
$$;

/** Uma varredura de um workspace: cria os rascunhos que faltam e grava o resumo. Devolve as contagens. */
create or replace function public.assistant_scan(ws uuid, slot text default 'manual')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s jsonb;
  today date := (now() at time zone 'America/Sao_Paulo')::date;
  dias int;
  c jsonb;
begin
  select coalesce(settings, '{}'::jsonb) into s from public.workspaces where id = ws;
  dias := coalesce((s #>> '{assistente,diasProposta}')::int, 3);

  -- Follow-ups vencidos (próximo contato até hoje) -> rascunho de mensagem.
  -- Não recria o que você aprovou ou descartou nos últimos X dias (mesmo prazo das propostas).
  if coalesce((s #>> '{assistente,fontes,followups}')::boolean, true) then
    insert into public.assistant_drafts (workspace_id, business_id, contact_id, source_type, source_id, title, body)
    select ws, k.business_id, k.id, 'followup', k.id, 'Follow-up: ' || k.name,
           replace(replace(public.assistant_template(s, 'followup'), '[nome]', public.assistant_first_name(k)), '[empresa]', coalesce(k.company, k.name))
    from public.contacts k
    where k.workspace_id = ws and k.deleted_at is null and k.status <> 'perdido'
      and k.next_contact_at is not null and (k.next_contact_at at time zone 'America/Sao_Paulo')::date <= today
      and not exists (select 1 from public.assistant_drafts d where d.source_type = 'followup' and d.source_id = k.id
                      and (d.status = 'pendente' or d.decided_at > now() - make_interval(days => dias)));
  end if;

  -- Propostas enviadas sem resposta há X dias -> rascunho de cobrança gentil.
  if coalesce((s #>> '{assistente,fontes,propostas}')::boolean, true) then
    insert into public.assistant_drafts (workspace_id, business_id, contact_id, source_type, source_id, title, body)
    select ws, p.business_id, p.contact_id, 'proposta', p.id, 'Proposta parada: ' || p.title,
           replace(replace(public.assistant_template(s, 'proposta'), '[nome]', public.assistant_first_name(k)), '[proposta]', p.title)
    from public.proposals p join public.contacts k on k.id = p.contact_id
    where p.workspace_id = ws and p.deleted_at is null and p.status in ('enviada', 'em_negociacao')
      and coalesce(p.sent_at, p.created_at) < now() - make_interval(days => dias)
      and not exists (select 1 from public.assistant_drafts d where d.source_type = 'proposta' and d.source_id = p.id
                      and (d.status = 'pendente' or d.decided_at > now() - make_interval(days => dias)));
  end if;

  c := jsonb_build_object(
    'tarefas_hoje', (select count(*) from public.tasks t where t.workspace_id = ws and t.deleted_at is null and t.status <> 'concluida' and (t.my_day_date = today or t.due_date = today)),
    'tarefas_atrasadas', (select count(*) from public.tasks t where t.workspace_id = ws and t.deleted_at is null and t.status <> 'concluida' and t.due_date < today),
    'contas_7d', (select count(*) from public.payables p where p.workspace_id = ws and p.status in ('pendente','atrasado','parcial') and p.due_date <= today + 7),
    'compromissos_hoje', (select count(*) from public.appointments a where a.workspace_id = ws and (a.starts_at at time zone 'America/Sao_Paulo')::date = today),
    'entregas_atrasadas', (select count(*) from public.deliveries d where d.workspace_id = ws and d.deleted_at is null and d.status not in ('aprovado','publicado') and d.due_date < today),
    'rascunhos', (select count(*) from public.assistant_drafts d where d.workspace_id = ws and d.status = 'pendente')
  );
  insert into public.assistant_digests (workspace_id, slot, counts) values (ws, slot, c);
  return c;
end $$;
revoke execute on function public.assistant_scan(uuid, text) from public, anon, authenticated;

/** "Varrer agora" na tela: só quem pode editar o workspace. */
create or replace function public.assistant_scan_now(ws uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.can_write(ws) then raise exception 'sem permissão'; end if;
  return public.assistant_scan(ws, 'manual');
end $$;
revoke execute on function public.assistant_scan_now(uuid) from public, anon;
grant execute on function public.assistant_scan_now(uuid) to authenticated;

/** Chamado de hora em hora pelo agendador: varre os workspaces cujo horário bate com a hora atual (Brasília). */
create or replace function public.assistant_tick()
returns void language plpgsql security definer set search_path = public as $$
declare
  w record;
  h text := to_char(now() at time zone 'America/Sao_Paulo', 'HH24');
begin
  for w in
    select id, coalesce(settings #> '{assistente,horarios}', '["07","13","18"]'::jsonb) as hs
    from public.workspaces
    where coalesce((settings #>> '{assistente,ativo}')::boolean, true)
  loop
    if w.hs ? h and not exists (
      select 1 from public.assistant_digests d
      where d.workspace_id = w.id and d.slot = h and (d.created_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date
    ) then
      perform public.assistant_scan(w.id, h);
    end if;
  end loop;
end $$;
revoke execute on function public.assistant_tick() from public, anon, authenticated;
