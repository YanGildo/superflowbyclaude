-- Proposta parada: o padrão passa de 3 para 7 dias sem resposta (continua ajustável em Configurações → Assistente).
create or replace function public.assistant_scan(ws uuid, slot text default 'manual')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s jsonb;
  today date := (now() at time zone 'America/Sao_Paulo')::date;
  dias int;
  c jsonb;
begin
  select coalesce(settings, '{}'::jsonb) into s from public.workspaces where id = ws;
  dias := coalesce((s #>> '{assistente,diasProposta}')::int, 7);

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
