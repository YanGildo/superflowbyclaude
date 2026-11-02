-- Agendador da Central do dia: de hora em hora (minuto 5) confere se é hora de varrer algum workspace.
-- Os horários (padrão 07h, 13h e 18h de Brasília) ficam em Configurações → Assistente.
select cron.schedule('superflow-assistente', '5 * * * *', $$select public.assistant_tick()$$);
