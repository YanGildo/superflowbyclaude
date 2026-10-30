-- Scripts: valores padrão das variáveis por segmento (ex.: {"prazo": "3 dias", "chave PIX": "..."}).
alter table public.script_segments add column variables jsonb not null default '{}'::jsonb;
