-- Painel do cliente (ex.: samantharelocation.com/painel): o cliente entra com e-mail e senha e só acessa,
-- por funções, os funis liberados em portal_access. Nenhuma tabela fica aberta para ele.
-- Não mexe em site_capture_lead, site_track nem site_lead_targets, nem nas políticas existentes.

create table if not exists public.portal_access (
  user_id     uuid not null references auth.users(id) on delete cascade,
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, pipeline_id)
);
alter table public.portal_access enable row level security;  -- sem políticas: ninguém lê direto
revoke all on public.portal_access from anon, authenticated;

/** Confere login e acesso ao funil; devolve o funil. */
create or replace function public.portal_check(_pipeline uuid) returns public.pipelines
language plpgsql stable security definer set search_path = public as $$
declare pl public.pipelines;
begin
  if auth.uid() is null then raise exception 'Entre com seu e-mail e senha.'; end if;
  if not exists (select 1 from public.portal_access where user_id = auth.uid() and pipeline_id = _pipeline) then
    raise exception 'Você não tem acesso a esta campanha.';
  end if;
  select * into pl from public.pipelines where id = _pipeline;
  return pl;
end $$;

/** Confere o lead (deal) e devolve o deal, já validando o acesso ao funil dele. */
create or replace function public.portal_deal(_deal uuid) returns public.deals
language plpgsql stable security definer set search_path = public as $$
declare d public.deals;
begin
  if auth.uid() is null then raise exception 'Entre com seu e-mail e senha.'; end if;
  select * into d from public.deals where id = _deal and deleted_at is null;
  if not found or not exists (select 1 from public.portal_access where user_id = auth.uid() and pipeline_id = d.pipeline_id) then
    raise exception 'Lead não encontrado.';
  end if;
  return d;
end $$;

create or replace function public.portal_my_campaigns() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Entre com seu e-mail e senha.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('pipeline_id', p.id, 'name', p.name) order by p.position, p.name)
                     from public.portal_access a join public.pipelines p on p.id = a.pipeline_id
                    where a.user_id = auth.uid()), '[]'::jsonb);
end $$;

/** Respostas do formulário: site (answers [{q,a}]) + importação CSV (respostas [{pergunta,resposta}]). */
create or replace function public.portal_answers(_meta jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select jsonb_build_object('pergunta', e->>'q', 'resposta', e->>'a') x
      from jsonb_array_elements(case when jsonb_typeof(_meta->'answers') = 'array' then _meta->'answers' else '[]'::jsonb end) e
     where coalesce(e->>'q', '') <> '' and coalesce(e->>'a', '') <> ''
    union all
    select jsonb_build_object('pergunta', e->>'pergunta', 'resposta', e->>'resposta')
      from jsonb_array_elements(case when jsonb_typeof(_meta->'respostas') = 'array' then _meta->'respostas' else '[]'::jsonb end) e
     where coalesce(e->>'pergunta', '') <> '' and coalesce(e->>'resposta', '') <> ''
  ) t $$;

create or replace function public.portal_board(_pipeline uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.portal_check(_pipeline);
  return jsonb_build_object(
    'stages', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'position', s.position,
                                  'outcome', case when s.outcome in ('won', 'lost') then s.outcome end) order by s.position)
                          from public.pipeline_stages s where s.pipeline_id = _pipeline), '[]'::jsonb),
    'leads', coalesce((select jsonb_agg(jsonb_build_object(
                'deal_id', d.id, 'stage_id', d.stage_id, 'name', coalesce(c.name, d.title),
                'phone', c.phone, 'whatsapp', c.whatsapp, 'email', c.email, 'city', c.city, 'country', c.country,
                'temperature', case when c.temperature in ('quente', 'morno', 'frio') then c.temperature end,
                'source', c.source,
                -- Lead do Meta (CSV): data do formulário; senão, quando entrou no funil.
                'arrived_at', coalesce(case when c.meta->>'created_time' ~ '^\d{4}-\d{2}-\d{2}' then (c.meta->>'created_time')::timestamptz end, d.created_at),
                'respostas', public.portal_answers(c.meta),
                'notes', coalesce((select jsonb_agg(jsonb_build_object('at', a.at, 'text', a.notes, 'author', pr.full_name) order by a.at desc)
                                     from public.activities a left join public.profiles pr on pr.id = a.responsible_id
                                    where a.deal_id = d.id and a.type = 'nota' and coalesce(a.notes, '') <> ''), '[]'::jsonb),
                'updated_at', d.updated_at) order by d.created_at desc)
              from public.deals d left join public.contacts c on c.id = d.contact_id
             where d.pipeline_id = _pipeline and d.deleted_at is null and (c.id is null or c.deleted_at is null)), '[]'::jsonb));
end $$;

create or replace function public.portal_move_lead(_deal uuid, _stage uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d public.deals; st public.pipeline_stages;
begin
  d := public.portal_deal(_deal);
  select * into st from public.pipeline_stages where id = _stage and pipeline_id = d.pipeline_id;
  if not found then raise exception 'Etapa inválida.'; end if;
  if d.stage_id = _stage then return; end if;
  -- Status, data de fechamento e status do contato seguem o gatilho deals_stage_effects (igual a arrastar no Superflow).
  update public.deals set stage_id = _stage, position = coalesce((select max(position) + 1 from public.deals where stage_id = _stage and deleted_at is null), 0),
         updated_at = now() where id = _deal;
  -- Igual ao Superflow: ao ir para Ganho, registra a conversão no histórico.
  if st.outcome = 'won' and d.status <> 'won' then
    insert into public.activities (workspace_id, business_id, contact_id, deal_id, category, type, outcome, value, responsible_id, origin)
    values (d.workspace_id, d.business_id, d.contact_id, d.id, 'conversao', 'Negócio fechado', 'fechado',
            coalesce(d.recurring_value, d.value), auth.uid(), 'painel');
  end if;
end $$;

create or replace function public.portal_set_temperature(_deal uuid, _temperature text) returns void
language plpgsql security definer set search_path = public as $$
declare d public.deals;
begin
  d := public.portal_deal(_deal);
  if _temperature is not null and _temperature not in ('quente', 'morno', 'frio') then raise exception 'Temperatura inválida.'; end if;
  update public.contacts set temperature = _temperature, updated_at = now() where id = d.contact_id;
  update public.deals set updated_at = now() where id = d.id;
end $$;

create or replace function public.portal_add_note(_deal uuid, _text text) returns void
language plpgsql security definer set search_path = public as $$
declare d public.deals; t text := nullif(trim(coalesce(_text, '')), '');
begin
  d := public.portal_deal(_deal);
  if t is null then raise exception 'Escreva a anotação.'; end if;
  if length(t) > 2000 then raise exception 'A anotação pode ter até 2000 caracteres.'; end if;
  insert into public.activities (workspace_id, business_id, contact_id, deal_id, category, type, channel, summary, notes, responsible_id, origin)
  values (d.workspace_id, d.business_id, d.contact_id, d.id, 'contato', 'nota', 'painel', 'Anotação no painel', t, auth.uid(), 'painel');
  update public.deals set updated_at = now() where id = d.id;
end $$;

/** Só o administrador do Superflow: libera ou retira um funil para um login (pelo e-mail). */
create or replace function public.portal_grant(_email text, _pipeline uuid, _on boolean default true) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  if not public.is_app_admin() then raise exception 'Só o administrador do Superflow libera painéis.'; end if;
  select id into u from auth.users where lower(email) = lower(trim(_email));
  if u is null then raise exception 'Usuário não encontrado. Crie o login primeiro.'; end if;
  if _on then insert into public.portal_access (user_id, pipeline_id) values (u, _pipeline) on conflict do nothing;
  else delete from public.portal_access where user_id = u and pipeline_id = _pipeline; end if;
end $$;

revoke execute on function public.portal_check(uuid), public.portal_deal(uuid), public.portal_answers(jsonb) from public, anon, authenticated;
revoke execute on function public.portal_my_campaigns(), public.portal_board(uuid), public.portal_move_lead(uuid, uuid),
  public.portal_set_temperature(uuid, text), public.portal_add_note(uuid, text), public.portal_grant(text, uuid, boolean) from public, anon;
grant execute on function public.portal_my_campaigns(), public.portal_board(uuid), public.portal_move_lead(uuid, uuid),
  public.portal_set_temperature(uuid, text), public.portal_add_note(uuid, text), public.portal_grant(text, uuid, boolean) to authenticated;
