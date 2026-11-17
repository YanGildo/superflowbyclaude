-- Envia a fila de avisos a cada 2 minutos (a função não faz nada enquanto não houver RESEND_API_KEY).
create extension if not exists pg_net;
select cron.unschedule('send-notifications') where exists (select 1 from cron.job where jobname = 'send-notifications');
select cron.schedule('send-notifications', '*/2 * * * *', $$
  select net.http_post(
    url := 'https://jxzogffjeedimdvcliqp.supabase.co/functions/v1/send-notifications',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb)
$$);
