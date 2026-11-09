-- Formulários do site (rgmarketingbr.com/<slug>) editáveis no Superflow.
--
-- site_forms            : um formulário por página (slug), com perguntas, textos, botão final,
--                         mensagem do WhatsApp e o funil/etapa onde o lead cai.
-- site_form_responses   : uma linha por pessoa que começou o formulário (vai sendo completada).
-- site_get_form(slug)   : pública, devolve só o conteúdo de um formulário ativo (o site usa).
-- site_capture_lead()   : agora procura o formulário em site_forms (site_lead_targets fica de reserva)
--                         e também grava a resposta em site_form_responses.

create table if not exists public.site_forms (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  business_id   uuid references public.businesses(id) on delete set null,
  slug          text not null unique
                check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 40
                       and slug not in ('usa','brasil','portfolio','auth','admin','api','f','paginas','sitemap',
                                        'cidadanianow','martec-portas-de-aco','new-doors-portas-automaticas','prime-portas-automaticas')),
  name          text not null,
  active        boolean not null default true,
  pipeline_id   uuid references public.pipelines(id) on delete set null,
  stage_id      uuid references public.pipeline_stages(id) on delete set null,
  source        text not null default 'Site / Landing page',
  content       jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object' and pg_column_size(content) < 60000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.site_form_responses (
  id            uuid primary key default gen_random_uuid(),
  form_id       uuid not null references public.site_forms(id) on delete cascade,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  lead_key      uuid not null,
  contact_id    uuid references public.contacts(id) on delete set null,
  name          text,
  whatsapp      text,
  answers       jsonb not null default '[]'::jsonb,
  utm           jsonb not null default '{}'::jsonb,
  done          boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (form_id, lead_key)
);
create index if not exists site_form_responses_form on public.site_form_responses (form_id, created_at desc);

alter table public.site_forms enable row level security;
alter table public.site_form_responses enable row level security;
create policy site_forms_read   on public.site_forms for select using (public.member_level(workspace_id, 'comercial') >= 1);
create policy site_forms_insert on public.site_forms for insert with check (public.member_level(workspace_id, 'comercial') >= 2);
create policy site_forms_update on public.site_forms for update using (public.member_level(workspace_id, 'comercial') >= 2) with check (public.member_level(workspace_id, 'comercial') >= 2);
create policy site_forms_delete on public.site_forms for delete using (public.member_level(workspace_id, 'comercial') >= 2);
create policy site_form_responses_read   on public.site_form_responses for select using (public.member_level(workspace_id, 'comercial') >= 1);
create policy site_form_responses_delete on public.site_form_responses for delete using (public.member_level(workspace_id, 'comercial') >= 2);
revoke all on public.site_forms, public.site_form_responses from anon;
grant select, insert, update, delete on public.site_forms to authenticated;
grant select, delete on public.site_form_responses to authenticated;

create or replace function public.site_forms_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists site_forms_touch on public.site_forms;
create trigger site_forms_touch before update on public.site_forms for each row execute function public.site_forms_touch();

-- O diagnóstico atual vira o primeiro formulário (mesmo funil e etapa de antes).
insert into public.site_forms (workspace_id, business_id, slug, name, pipeline_id, stage_id, source, content)
select t.workspace_id, t.business_id, 'diagnostico', 'Diagnóstico · Campanha B (assessorias)', t.pipeline_id, t.stage_id, t.source,
       '{"seo": {"title": "Diagnóstico gratuito de marketing · RG Marketing", "description": "Responda em 2 minutos e descubra como atrair clientes com perfil para a sua assessoria, escritório ou empresa de relocation."}, "intro": {"eyebrow": "Diagnóstico gratuito · 2 minutos", "title": "Sua empresa recebe contatos, mas", "highlight": "poucos viram clientes?", "subtitle": "Para assessorias de cidadania, advogados de imigração, vistos e relocation. Responda algumas perguntas e descubra onde o seu marketing está perdendo clientes.", "button": "Começar"}, "done": {"eyebrow": "Diagnóstico concluído", "title": "{nome}, a sua empresa tem perfil para crescer com uma operação de marketing.", "text": "Toque no botão abaixo: o WhatsApp abre com as suas respostas prontas e a gente marca a conversa de diagnóstico.", "button": "Agendar meu diagnóstico no WhatsApp", "whatsapp": "5519982350262", "message": "Olá! Acabei de fazer o diagnóstico no site."}, "privacy": "Usamos seus dados só para falar com você sobre este diagnóstico.", "steps": [{"id": "nome", "q": "Para começar, como você se chama?", "kind": "text", "placeholder": "Seu nome", "label": "Nome", "map": "name"}, {"id": "whatsapp", "q": "Prazer, {nome}! Qual o seu WhatsApp?", "hint": "Com o código do país. Ex.: +351 912 345 678 ou +55 11 99999-9999", "kind": "text", "input": "tel", "placeholder": "+351 ...", "label": "WhatsApp", "map": "whatsapp"}, {"id": "email", "q": "E o seu e-mail?", "kind": "text", "input": "email", "placeholder": "voce@empresa.com", "optional": true, "label": "E-mail", "map": "email"}, {"id": "empresa", "q": "Qual o nome da sua empresa ou escritório?", "kind": "text", "placeholder": "Nome da empresa", "label": "Empresa", "map": "company"}, {"id": "instagram", "q": "Qual o @ do Instagram ou o site?", "kind": "text", "placeholder": "@suaempresa", "optional": true, "label": "Instagram / site", "map": "instagram"}, {"id": "pais", "q": "Em qual país vocês atendem os clientes?", "kind": "options", "options": ["Portugal", "Brasil", "Portugal e Brasil", "Outro"], "label": "País", "map": "country"}, {"id": "segmento", "q": "Qual destas descreve melhor a sua empresa?", "kind": "options", "label": "Segmento", "map": "segment", "options": ["Assessoria de cidadania europeia", "Advocacia de imigração e nacionalidade", "Vistos e processos migratórios", "Relocation", "Outra área jurídica", "Outro tipo de empresa"], "values": {"Assessoria de cidadania europeia": "Cidadania", "Advocacia de imigração e nacionalidade": "Imigração / advocacia", "Vistos e processos migratórios": "Vistos", "Relocation": "Relocation", "Outra área jurídica": "Outro jurídico", "Outro tipo de empresa": "Outro"}}, {"id": "especialidade", "q": "Quais cidadanias vocês trabalham?", "kind": "options", "label": "Cidadanias", "when": {"step": "segmento", "in": ["Assessoria de cidadania europeia"]}, "options": ["Italiana", "Portuguesa", "Espanhola", "Várias / outras"]}, {"id": "especialidade", "q": "Quais processos vocês mais atendem?", "kind": "options", "label": "Processos", "when": {"step": "segmento", "in": ["Advocacia de imigração e nacionalidade", "Vistos e processos migratórios"]}, "options": ["Vistos de trabalho ou procura de trabalho", "Autorização de residência", "Nacionalidade", "Reagrupamento familiar", "Vários"]}, {"id": "especialidade", "q": "O que está incluído no seu serviço?", "kind": "options", "label": "Serviço de relocation", "when": {"step": "segmento", "in": ["Relocation"]}, "options": ["Busca de moradia e arrendamento", "Documentação e burocracia", "Pacote completo da mudança", "Consultoria pontual"]}, {"id": "origem", "q": "Hoje, de onde vem a maior parte dos seus clientes?", "kind": "options", "label": "Origem dos clientes", "options": ["Quase tudo por indicação", "Instagram orgânico", "Anúncios pagos", "Parcerias ou outros canais"]}, {"id": "problema", "q": "Qual o maior problema na sua captação hoje?", "kind": "options", "label": "Maior problema", "options": ["Muitos contatos curiosos ou sem perfil", "Pouco volume, dependo de indicação", "Os leads somem depois do orçamento", "Não consigo explicar bem o meu serviço", "Estou satisfeito com a captação"]}, {"id": "volume", "q": "Quantos contratos vocês fecham por mês, em média?", "kind": "options", "label": "Contratos por mês", "options": ["Até 3", "De 4 a 10", "De 11 a 25", "Mais de 25"]}, {"id": "trafego", "q": "Vocês já investiram em anúncios pagos?", "kind": "options", "label": "Anúncios pagos", "options": ["Nunca investimos", "Já testamos, mas sem resultado", "Já investimos e queremos escalar", "Investimos hoje com outra agência ou freelancer"]}, {"id": "orcamento", "q": "Quanto pretendem investir por mês em anúncios?", "hint": "Só a verba dos anúncios, sem contar a gestão.", "kind": "options", "label": "Verba mensal", "when": {"step": "pais", "in": ["Portugal"]}, "options": ["Até 300 €", "De 300 € a 800 €", "De 800 € a 2.000 €", "Acima de 2.000 €"]}, {"id": "orcamento", "q": "Quanto pretendem investir por mês em anúncios?", "hint": "Só a verba dos anúncios, sem contar a gestão.", "kind": "options", "label": "Verba mensal", "when": {"step": "pais", "in": ["Portugal"], "not": true}, "options": ["Até R$ 1.500", "De R$ 1.500 a R$ 3.000", "De R$ 3.000 a R$ 8.000", "Acima de R$ 8.000"]}, {"id": "objetivo", "q": "Qual o seu maior objetivo agora?", "kind": "options", "label": "Objetivo", "options": ["Ter previsibilidade de clientes todo mês", "Atrair só clientes com perfil", "Depender menos de indicação", "Lançar um serviço ou unidade nova"]}, {"id": "urgencia", "q": "Quando pretende começar?", "kind": "options", "label": "Quando começar", "map": "temperature", "options": ["Imediatamente", "Nas próximas 2 a 4 semanas", "Ainda estou pesquisando"], "values": {"Imediatamente": "quente", "Nas próximas 2 a 4 semanas": "morno", "Ainda estou pesquisando": "frio"}}]}'::jsonb
  from public.site_lead_targets t where t.form = 'diagnostico'
on conflict (slug) do nothing;

-- Pública: só o conteúdo de um formulário ativo.
create or replace function public.site_get_form(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('slug', slug, 'content', content) from public.site_forms where slug = p_slug and active;
$$;
revoke all on function public.site_get_form(text) from public;
grant execute on function public.site_get_form(text) to anon, authenticated;

create or replace function public.site_capture_lead(p_form text, p_key uuid, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  f        public.site_forms;
  v_ws     uuid; v_biz uuid; v_pipe uuid; v_stage uuid; v_source text;
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
  v_ans    jsonb := case when jsonb_typeof(p_data->'answers') = 'array' then p_data->'answers' else '[]'::jsonb end;
  v_done   boolean := coalesce((p_data->>'done')::boolean, false);
  v_notes  text;
begin
  if p_key is null or p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'dados inválidos';
  end if;
  if pg_column_size(p_data) > 16000 then
    raise exception 'dados grandes demais';
  end if;

  select * into f from public.site_forms where slug = p_form and active;
  if found then
    v_ws := f.workspace_id; v_biz := f.business_id; v_pipe := f.pipeline_id; v_stage := f.stage_id; v_source := f.source;
  else
    select workspace_id, business_id, pipeline_id, stage_id, source into v_ws, v_biz, v_pipe, v_stage, v_source
      from public.site_lead_targets where form = p_form;
    if not found then raise exception 'formulário desconhecido'; end if;
  end if;

  select string_agg('• ' || left(coalesce(x->>'q', ''), 200) || ': ' || left(coalesce(x->>'a', ''), 400), E'\n')
    into v_notes
    from jsonb_array_elements(v_ans) with ordinality as a(x, i)
   where i <= 40;
  v_notes := 'Formulário do site (' || p_form || ')' || case when v_done then ' · concluído' else ' · em andamento' end
             || coalesce(E'\n' || v_notes, '');

  select id into c_id
    from public.contacts
   where workspace_id = v_ws
     and meta->>'lead_key' = p_key::text
     and created_at > now() - interval '6 hours'
   limit 1;

  if c_id is null then
    if v_name is null then
      return;  -- ainda sem nome: nada a salvar
    end if;
    insert into public.contacts (workspace_id, business_id, kind, name, company, whatsapp, phone, email, instagram,
                                 country, segment, source, temperature, notes, meta)
    values (v_ws, v_biz, case when v_comp is null then 'pessoa' else 'empresa' end,
            v_name, v_comp, v_wa, v_wa, v_email, v_ig, v_ctry, v_seg, v_source, v_temp, v_notes,
            jsonb_build_object('lead_key', p_key::text, 'form', p_form, 'utm', v_utm, 'answers', v_ans))
    returning id into c_id;

    if v_pipe is not null and v_stage is not null then
      insert into public.deals (workspace_id, business_id, contact_id, pipeline_id, stage_id, title)
      values (v_ws, v_biz, c_id, v_pipe, v_stage, coalesce(v_comp, v_name));
    end if;

    insert into public.activities (workspace_id, business_id, contact_id, category, type, channel, summary, origin)
    values (v_ws, v_biz, c_id, 'conversao', 'Lead gerado', v_source,
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
                      'answers', v_ans, 'done', v_done)
    where id = c_id;

    if v_pipe is not null then
      update public.deals set title = coalesce(v_comp, title)
       where contact_id = c_id and pipeline_id = v_pipe and v_comp is not null;
    end if;
  end if;

  -- Resposta completa (com nome, WhatsApp e e-mail) para a aba Respostas do Superflow.
  if f.id is not null then
    insert into public.site_form_responses (form_id, workspace_id, lead_key, contact_id, name, whatsapp, answers, utm, done)
    values (f.id, v_ws, p_key, c_id, v_name, v_wa,
            coalesce(case when jsonb_typeof(p_data->'all') = 'array' then p_data->'all' end, v_ans), v_utm, v_done)
    on conflict (form_id, lead_key) do update set
      contact_id = excluded.contact_id, name = coalesce(excluded.name, site_form_responses.name),
      whatsapp = coalesce(excluded.whatsapp, site_form_responses.whatsapp), answers = excluded.answers,
      utm = case when excluded.utm = '{}'::jsonb then site_form_responses.utm else excluded.utm end,
      done = excluded.done or site_form_responses.done, updated_at = now();
  end if;
end;
$$;

revoke all on function public.site_capture_lead(text, uuid, jsonb) from public;
grant execute on function public.site_capture_lead(text, uuid, jsonb) to anon, authenticated;

