-- Aviso do Supabase: funções auxiliares da Central com search_path fixo.
alter function public.assistant_template(jsonb, text) set search_path = public;
alter function public.assistant_first_name(public.contacts) set search_path = public;
