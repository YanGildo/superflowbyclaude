-- Importação de leads: ao atualizar um contato, campos vazios do arquivo novo não apagam o que já existia
-- (data do lead, formulário, anúncio) e as respostas antigas de outras perguntas são mantidas.
-- Não mexe em site_capture_lead nem em site_lead_targets.

create or replace function public.import_campaign_leads(_pipeline uuid, _stage uuid, _rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  pl public.pipelines; st public.pipeline_stages;
  r jsonb; c_id uuid; v_new boolean;
  v_name text; v_phone text; v_email text; v_lead text; v_temp text; v_src text; v_notes text; v_meta jsonb; v_resp jsonb;
  n_new int := 0; n_upd int := 0; n_skip int := 0; n_deals int := 0; errs jsonb := '[]'::jsonb; pos int;
begin
  select * into pl from public.pipelines where id = _pipeline;
  if not found then raise exception 'Campanha não encontrada.'; end if;
  if public.member_level(pl.workspace_id, 'comercial') < 2 then raise exception 'Você não tem permissão de edição no Comercial deste espaço.'; end if;
  select * into st from public.pipeline_stages where id = _stage and pipeline_id = _pipeline;
  if not found then raise exception 'Etapa não pertence a esta campanha.'; end if;
  if jsonb_typeof(_rows) <> 'array' or jsonb_array_length(_rows) > 1000 then raise exception 'Envie até 1000 linhas por vez.'; end if;

  for r in select * from jsonb_array_elements(_rows) loop
    begin
      v_name  := left(nullif(trim(r->>'name'), ''), 160);
      v_phone := left(public.norm_phone(r->>'phone'), 24);
      v_email := left(nullif(lower(trim(r->>'email')), ''), 160);
      v_lead  := nullif(trim(r#>>'{meta,meta_lead_id}'), '');
      v_temp  := case when r->>'temperature' in ('frio', 'morno', 'quente') then r->>'temperature' end;
      v_src   := left(nullif(trim(r->>'source'), ''), 200);
      v_resp  := case when jsonb_typeof(r->'respostas') = 'array' then r->'respostas' else '[]'::jsonb end;
      v_meta  := coalesce(case when jsonb_typeof(r->'meta') = 'object' then r->'meta' end, '{}'::jsonb)
                 || jsonb_build_object('respostas', v_resp);

      if v_name is null and v_phone is null and v_email is null then
        n_skip := n_skip + 1; continue;
      end if;

      c_id := null;
      if v_lead is not null then
        select id into c_id from public.contacts where workspace_id = pl.workspace_id and deleted_at is null and meta->>'meta_lead_id' = v_lead limit 1;
      end if;
      if c_id is null and v_phone is not null then
        select id into c_id from public.contacts where workspace_id = pl.workspace_id and deleted_at is null
           and (public.norm_phone(phone) = v_phone or public.norm_phone(whatsapp) = v_phone) limit 1;
      end if;
      if c_id is null and v_email is not null then
        select id into c_id from public.contacts where workspace_id = pl.workspace_id and deleted_at is null and lower(email) = v_email limit 1;
      end if;

      select string_agg(coalesce(x->>'pergunta', '') || ': ' || coalesce(x->>'resposta', ''), E'\n') into v_notes
        from jsonb_array_elements(v_resp) x;

      v_new := c_id is null;
      if v_new then
        insert into public.contacts (workspace_id, business_id, kind, name, phone, whatsapp, email, city, country, source, temperature, meta)
        values (pl.workspace_id, pl.business_id, 'pessoa', coalesce(v_name, v_email, v_phone), v_phone, v_phone, v_email,
                left(nullif(trim(r->>'city'), ''), 80), left(nullif(trim(r->>'country'), ''), 60), v_src, v_temp, jsonb_strip_nulls(v_meta))
        returning id into c_id;
        n_new := n_new + 1;
      else
        update public.contacts set
          name = coalesce(v_name, name), phone = coalesce(phone, v_phone), whatsapp = coalesce(whatsapp, v_phone),
          email = coalesce(email, v_email), city = coalesce(left(nullif(trim(r->>'city'), ''), 80), city),
          country = coalesce(left(nullif(trim(r->>'country'), ''), 60), country), source = coalesce(source, v_src),
          temperature = coalesce(v_temp, temperature),
          meta = coalesce(meta, '{}'::jsonb) || jsonb_strip_nulls(v_meta - 'respostas') || jsonb_build_object('respostas',
                   v_resp || coalesce((select jsonb_agg(o) from jsonb_array_elements(case when jsonb_typeof(meta->'respostas') = 'array' then meta->'respostas' else '[]'::jsonb end) o
                                       where not exists (select 1 from jsonb_array_elements(v_resp) n where n->>'pergunta' = o->>'pergunta')), '[]'::jsonb)),
          updated_at = now()
        where id = c_id;
        n_upd := n_upd + 1;
      end if;

      if not exists (select 1 from public.deals where contact_id = c_id and pipeline_id = _pipeline and status = 'open' and deleted_at is null) then
        select coalesce(max(position), -1) + 1 into pos from public.deals where stage_id = _stage and deleted_at is null;
        insert into public.deals (workspace_id, business_id, contact_id, pipeline_id, stage_id, title, status, position)
        values (pl.workspace_id, pl.business_id, c_id, _pipeline, _stage, coalesce(v_name, v_email, v_phone), 'open', pos);
        n_deals := n_deals + 1;
      end if;

      insert into public.activities (workspace_id, business_id, contact_id, category, type, channel, summary, notes, origin)
      values (pl.workspace_id, pl.business_id, c_id, 'conversao', 'lead', coalesce(r#>>'{meta,platform}', 'Meta'),
              case when v_new then 'Lead importado' else 'Lead importado (atualizado)' end || coalesce(' · ' || nullif(r#>>'{meta,form_name}', ''), ''),
              v_notes, coalesce(v_src, 'importacao'));
    exception when others then
      errs := errs || jsonb_build_object('line', r->>'line', 'erro', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('novos', n_new, 'atualizados', n_upd, 'ignorados', n_skip, 'cards', n_deals, 'erros', errs);
end $$;

revoke execute on function public.import_campaign_leads(uuid, uuid, jsonb) from public, anon;
grant execute on function public.import_campaign_leads(uuid, uuid, jsonb) to authenticated;
