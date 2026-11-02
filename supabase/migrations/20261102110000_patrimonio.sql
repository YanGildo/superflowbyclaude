-- Patrimônio líquido: bens fora do banco e histórico mensal.
-- Patrimônio = saldo de todas as contas + bens − (parcelas de dívidas em aberto + fatura atual dos cartões).
-- Reservas não somam de novo: o dinheiro reservado já está dentro de alguma conta.
create table public.fin_assets (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id  uuid references public.businesses(id) on delete set null,
  name         text not null check (length(trim(name)) > 0),
  kind         text not null default 'investimento' check (kind in ('investimento','imovel','veiculo','outro')),
  value        numeric(14,2) not null default 0 check (value >= 0),
  value_date   date not null default current_date,
  notes        text,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index fin_assets_ws_idx on public.fin_assets (workspace_id) where archived_at is null;
create trigger fin_assets_updated_at before update on public.fin_assets for each row execute function public.set_updated_at();

-- Um registro por mês (o do mês corrente é atualizado sempre que o patrimônio muda).
create table public.net_worth_snapshots (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  month        text not null check (month ~ '^\d{4}-\d{2}$'),
  accounts     numeric(14,2) not null default 0,
  goods        numeric(14,2) not null default 0,
  debts        numeric(14,2) not null default 0,
  net          numeric(14,2) not null default 0,
  updated_at   timestamptz not null default now(),
  unique (workspace_id, month)
);

do $$
declare t text;
begin
  foreach t in array array['fin_assets','net_worth_snapshots'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select using (public.is_member(workspace_id))', t || '_read', t);
    execute format('create policy %I on public.%I for insert with check (public.can_write(workspace_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update using (public.can_write(workspace_id)) with check (public.can_write(workspace_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete using (public.can_write(workspace_id))', t || '_delete', t);
  end loop;
end $$;
