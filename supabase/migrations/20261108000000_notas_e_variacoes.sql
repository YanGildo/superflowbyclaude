-- Notas flutuantes (por pessoa, privadas) + variações e ordem dos scripts.

create table if not exists public.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null,
  done boolean not null default false,
  page text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists user_notes_user on public.user_notes (user_id, done, created_at desc);
alter table public.user_notes enable row level security;
drop policy if exists user_notes_own on public.user_notes;
create policy user_notes_own on public.user_notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.user_notes to authenticated;

-- Variações: o texto principal continua em "body" (com um nome opcional em body_label);
-- as outras ficam em variations = [{ "label": "Curta", "body": "..." }].
alter table public.scripts add column if not exists body_label text;
alter table public.scripts add column if not exists variations jsonb not null default '[]'::jsonb;
alter table public.scripts add column if not exists position int not null default 0;

-- Ordem inicial = ordem de criação (dentro de cada segmento).
update public.scripts s set position = o.rn
from (select id, row_number() over (partition by workspace_id, segment_id order by created_at) as rn from public.scripts) o
where o.id = s.id and s.position = 0;
