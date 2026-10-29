-- =====================================================================
-- SUPERFLOW V2 — JOBS AGENDADOS (rodar depois do schema)
-- No Supabase: Database > Extensions > habilitar "pg_cron" (e "pg_net"
-- para chamar Edge Functions). Horários em UTC (BRT = UTC-3).
-- =====================================================================
create extension if not exists pg_cron;

-- A cada 5 min: marca contas atrasadas e expira PIX vencidos.
select cron.schedule('superflow-overdue', '*/5 * * * *', $$select public.job_mark_overdue()$$);

-- A cada 10 min: expira assinaturas VIP vencidas.
select cron.schedule('superflow-expire-vip', '*/10 * * * *', $$select public.job_expire_subscriptions()$$);

-- Todo dia 03:17 BRT (06:17 UTC): esvazia a lixeira (itens com mais de 30 dias).
select cron.schedule('superflow-purge-trash', '17 6 * * *', $$select public.job_purge_trash()$$);

-- Quando as Edge Functions existirem (fase 5/6), descomentar:
-- a cada minuto: dispara lembretes de tarefas, retoma fluxos em "Espera",
-- envia remarketing agendado e remove do grupo VIP quem expirou.
-- select cron.schedule('superflow-worker', '* * * * *', $$
--   select net.http_post(
--     url     := 'https://<PROJETO>.supabase.co/functions/v1/worker-tick',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_key', true))
--   );
-- $$);
