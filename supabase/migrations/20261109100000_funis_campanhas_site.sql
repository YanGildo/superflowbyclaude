-- Funis das campanhas da RG Marketing + entrada de leads do site (rgmarketingbr.com).
--
-- Campanha A (vídeos animados): anúncio -> WhatsApp. O lead é cadastrado no Superflow pelo
--   "Novo lead" com o código do anúncio (A1, A2, A3, E1...).
-- Campanha B (assessoria): anúncio -> rgmarketingbr.com/diagnostico. A página chama
--   site_capture_lead() a cada passo: quem desiste no meio fica salvo para follow-up.
--
-- Os funis (pipelines/etapas) são dados, criados à parte no espaço do dono.
-- Aqui fica só a estrutura: a tabela de destino e a função pública.

create table if not exists public.site_lead_targets (
  form          text primary key check (form ~ '^[a-z0-9-]{2,40}$'),   -- ex.: 'diagnostico'
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  business_id   uuid references public.businesses(id) on delete set null,
  pipeline_id   uuid not null references public.pipelines(id) on delete cascade,
  stage_id      uuid not null references public.pipeline_stages(id) on delete cascade,
  source        text not null default 'Site / Landing page',
  created_at    timestamptz not null default now()
);
-- Só a função (security definer) lê esta tabela; ninguém de fora enxerga.
alter table public.site_lead_targets enable row level security;
revoke all on public.site_lead_targets from anon, authenticated;

create index if not exists contacts_lead_key_idx on public.contacts ((meta->>'lead_key'));

/**
 * Recebe (e vai completando) um lead vindo de um formulário do site.
 *  p_form : chave em site_lead_targets (ex.: 'diagnostico')
 *  p_key  : uuid gerado no navegador, o mesmo em todos os passos do formulário
 *  p_data : { name, whatsapp, email, company, instagram, country, segment, temperature,
 *             utm: {...}, answers: [{q, a}], done: bool }
 * Cria contato + oportunidade + "Lead gerado" na primeira chamada que trouxer nome;
 * nas seguintes (até 6 h depois) só atualiza o mesmo contato.
 */
create or replace function public.site_capture_lead(p_form text, p_key uuid, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t        public.site_lead_targets;
  c_id     uuid;
  v_name   text := left(nullif(trim(p_data->>'name'), ''), 120);
  v_wa     text := left(nullif(regexp_replace(coalesce(p_data->>'whatsapp', ''), '[^0-9+]', '', 'g'), ''), 20);
  v_email  text := left(nullif(trim(lower(p_data->>'email')), ''), 160);
  v_comp   text := left(nullif(trim(p_data->>'company'), ''), 160);
  v_ig     text := left(nullif(trim(p_data->>'instagram'), ''), 80);
  v_ctry   text := left(nullif(trim(p_data->>'country'), ''), 40);
  v_seg    text := left(nullif(trim(p_data->>'segment'), ''), 60);
  v_temp   text := case when p_data->>'temperature' in ('frio','morno','quente') then p_data->>'temperature' end;
  v_utm    jsonb := case when jsonb_typeof(p_data->'utm') = 'object' then p_data->'utm' else '{}'::jsonb end;
  v_done   boolean := coalesce((p_data->>'done')::boolean, false);
  v_notes  text;
begin
  if p_key is null or p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'dados inválidos';
  end if;
  if pg_column_size(p_data) > 16000 then
    raise exception 'dados grandes demais';
  end if;

  select * into t from public.site_lead_targets where form = p_form;
  if not found then
    raise exception 'formulário desconhecido';
  end if;

  -- Respostas em texto legível (aparecem nas observações do contato).
  if jsonb_typeof(p_data->'answers') = 'array' then
    select string_agg('• ' || left(coalesce(x->>'q', ''), 200) || ': ' || left(coalesce(x->>'a', ''), 400), E'\n')
      into v_notes
      from jsonb_array_elements(p_data->'answers') with ordinality as a(x, i)
     where i <= 40;
  end if;
  v_notes := 'Formulário do site (' || p_form || ')' || case when v_done then ' · concluído' else ' · em andamento' end
             || coalesce(E'\n' || v_notes, '');

  select id into c_id
    from public.contacts
   where workspace_id = t.workspace_id
     and meta->>'lead_key' = p_key::text
     and created_at > now() - interval '6 hours'
   limit 1;

  if c_id is null then
    if v_name is null then
      return;  -- ainda sem nome: nada a salvar
    end if;
    insert into public.contacts (workspace_id, business_id, kind, name, company, whatsapp, phone, email, instagram,
                                 country, segment, source, temperature, notes, meta)
    values (t.workspace_id, t.business_id, case when v_comp is null then 'pessoa' else 'empresa' end,
            v_name, v_comp, v_wa, v_wa, v_email, v_ig, v_ctry, v_seg, t.source, v_temp, v_notes,
            jsonb_build_object('lead_key', p_key::text, 'form', p_form, 'utm', v_utm, 'answers', coalesce(p_data->'answers', '[]'::jsonb)))
    returning id into c_id;

    insert into public.deals (workspace_id, business_id, contact_id, pipeline_id, stage_id, title)
    values (t.workspace_id, t.business_id, c_id, t.pipeline_id, t.stage_id, coalesce(v_comp, v_name));

    insert into public.activities (workspace_id, business_id, contact_id, category, type, channel, summary, origin)
    values (t.workspace_id, t.business_id, c_id, 'conversao', 'Lead gerado', t.source,
            v_name || coalesce(' · ' || nullif(v_utm->>'utm_content', ''), ''), 'automatico');
  else
    update public.contacts set
      name        = coalesce(v_name, name),
      company     = coalesce(v_comp, company),
      whatsapp    = coalesce(v_wa, whatsapp),
      phone       = coalesce(v_wa, phone),
      email       = coalesce(v_email, email),
      instagram   = coalesce(v_ig, instagram),
      country     = coalesce(v_ctry, country),
      segment     = coalesce(v_seg, segment),
      temperature = coalesce(v_temp, temperature),
      notes       = v_notes,
      kind        = case when coalesce(v_comp, company) is null then kind else 'empresa' end,
      meta        = meta || jsonb_build_object(
                      'utm', case when v_utm = '{}'::jsonb then coalesce(meta->'utm', '{}'::jsonb) else v_utm end,
                      'answers', coalesce(p_data->'answers', meta->'answers'), 'done', v_done)
    where id = c_id;

    update public.deals set title = coalesce(v_comp, title)
     where contact_id = c_id and pipeline_id = t.pipeline_id and v_comp is not null;
  end if;
end;
$$;

revoke all on function public.site_capture_lead(text, uuid, jsonb) from public;
grant execute on function public.site_capture_lead(text, uuid, jsonb) to anon, authenticated;
