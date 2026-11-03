-- Importação de extrato + pagamento parcial (amortização) + correção de "desmarcar pago".

-- 1. Importação de extrato -------------------------------------------------------------------------
-- Cada linha importada tem uma "impressão digital": importar o mesmo extrato de novo não duplica nada.
alter table public.transactions add column import_key text;
alter table public.transactions add constraint transactions_import_key_uniq unique (workspace_id, import_key);
-- Número da conta (para reconhecer transferências entre as suas próprias contas no extrato).
alter table public.fin_accounts add column number text;

-- 2. Pagamento parcial ------------------------------------------------------------------------------
alter table public.payables add column paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0);

create table public.payable_payments (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  payable_id   uuid not null references public.payables(id) on delete cascade,
  amount       numeric(14,2) not null check (amount > 0),
  date         date not null default current_date,
  account_id   uuid references public.fin_accounts(id) on delete set null,
  notes        text,
  created_at   timestamptz not null default now()
);
create index payable_payments_payable_idx on public.payable_payments (payable_id);
alter table public.payable_payments enable row level security;
create policy payable_payments_read on public.payable_payments for select using (public.is_member(workspace_id));
create policy payable_payments_insert on public.payable_payments for insert with check (public.can_write(workspace_id));
create policy payable_payments_delete on public.payable_payments for delete using (public.can_write(workspace_id));

/** Pagamento parcial: vira lançamento de saída e soma no "já pago" da conta. Quitou tudo → status pago. */
create or replace function public.payable_payments_on_insert()
returns trigger language plpgsql as $$
declare p public.payables%rowtype;
begin
  select * into p from public.payables where id = new.payable_id for update;
  if p.status in ('pago', 'cancelado') then raise exception 'Esta conta já está paga ou cancelada.'; end if;
  if new.amount > p.amount - p.paid_amount + 0.001 then
    raise exception 'O valor passa do que falta pagar (falta %).', to_char(p.amount - p.paid_amount, 'FM999G999G990D00');
  end if;
  insert into public.transactions (workspace_id, business_id, type, amount, date, description, method,
                                   account_id, card_id, category_id, source_type, source_id)
  values (p.workspace_id, p.business_id, 'saida', new.amount, new.date, p.title || ' (pagamento parcial)', p.method,
          coalesce(new.account_id, p.account_id), p.card_id, p.category_id, 'payable_payment', new.id);
  update public.payables
     set paid_amount = paid_amount + new.amount,
         status = case when paid_amount + new.amount >= amount then 'pago' else 'parcial' end,
         paid_date = case when paid_amount + new.amount >= amount then new.date else paid_date end
   where id = p.id;
  return new;
end $$;
create trigger payable_payments_on_insert after insert on public.payable_payments
  for each row execute function public.payable_payments_on_insert();

/** Desfazer um pagamento parcial: apaga o lançamento e devolve o valor ao "falta pagar". */
create or replace function public.payable_payments_on_delete()
returns trigger language plpgsql as $$
begin
  delete from public.transactions where source_type = 'payable_payment' and source_id = old.id;
  update public.payables
     set paid_amount = greatest(0, paid_amount - old.amount),
         status = case
           when exists (select 1 from public.transactions t where t.source_type = 'payable' and t.source_id = payables.id) then status
           when paid_amount - old.amount > 0 then 'parcial'
           when due_date < current_date then 'atrasado'
           else 'pendente' end,
         paid_date = null
   where id = old.payable_id;
  -- Dívida que estava quitada volta a ficar ativa.
  update public.debts d set status = 'ativa'
   where d.status = 'quitada' and d.id = (select debt_id from public.payables where id = old.payable_id);
  return old;
end $$;
create trigger payable_payments_on_delete after delete on public.payable_payments
  for each row execute function public.payable_payments_on_delete();

-- 3. Pagar / desmarcar pago ---------------------------------------------------------------------------
-- Pagar: lança só o que ainda faltava (o que foi pago em parcelas já virou lançamento).
-- Desmarcar pago: apaga o lançamento gerado e a próxima repetição criada (antes ficava sobrando).
create or replace function public.payables_on_pay()
returns trigger language plpgsql as $$
declare rest numeric(14,2);
begin
  if new.status = 'pago' and old.status is distinct from 'pago' then
    new.paid_date := coalesce(new.paid_date, current_date);
    rest := new.amount - coalesce(new.paid_amount, 0);
    if rest > 0 then
      insert into public.transactions (workspace_id, business_id, type, amount, date, description, method,
                                       account_id, card_id, category_id, source_type, source_id)
      values (new.workspace_id, new.business_id, 'saida', rest, new.paid_date, new.title, new.method,
              new.account_id, new.card_id, new.category_id, 'payable', new.id)
      on conflict (source_type, source_id) do nothing;
    end if;
    if new.recurrence <> 'none' then
      insert into public.payables (workspace_id, business_id, title, category_id, amount, due_date,
                                   method, recurrence, card_id, account_id)
      values (new.workspace_id, new.business_id, new.title, new.category_id, new.amount,
              (new.due_date + case new.recurrence when 'weekly' then interval '7 days'
                                                  when 'monthly' then interval '1 month'
                                                  else interval '1 year' end)::date,
              new.method, new.recurrence, new.card_id, new.account_id);
    end if;
  elsif old.status = 'pago' and new.status is distinct from 'pago' then
    delete from public.transactions where source_type = 'payable' and source_id = new.id;
    new.paid_date := null;
    if new.paid_amount >= new.amount then new.paid_amount := 0; end if;
    if new.recurrence <> 'none' then
      delete from public.payables x
       where x.workspace_id = new.workspace_id and x.title = new.title and x.paid_amount = 0
         and x.status in ('pendente', 'atrasado') and x.debt_id is null and x.id <> new.id
         and x.due_date = (new.due_date + case new.recurrence when 'weekly' then interval '7 days'
                                                              when 'monthly' then interval '1 month'
                                                              else interval '1 year' end)::date;
    end if;
  end if;
  return new;
end $$;

create or replace function public.receivables_on_receive()
returns trigger language plpgsql as $$
begin
  if new.status = 'recebido' and old.status is distinct from 'recebido' then
    new.received_date := coalesce(new.received_date, current_date);
    insert into public.transactions (workspace_id, business_id, type, amount, date, description,
                                     account_id, contact_id, category_id, source_type, source_id)
    values (new.workspace_id, new.business_id, 'entrada', new.amount, new.received_date, new.title,
            new.account_id, new.contact_id, new.category_id, 'receivable', new.id)
    on conflict (source_type, source_id) do nothing;
    if new.recurrence <> 'none' then
      insert into public.receivables (workspace_id, business_id, contact_id, proposal_id, title, category_id,
                                      amount, expected_date, recurrence, account_id)
      values (new.workspace_id, new.business_id, new.contact_id, new.proposal_id, new.title, new.category_id,
              new.amount,
              (new.expected_date + case new.recurrence when 'weekly' then interval '7 days'
                                                       when 'monthly' then interval '1 month'
                                                       else interval '1 year' end)::date,
              new.recurrence, new.account_id);
    end if;
  elsif old.status = 'recebido' and new.status is distinct from 'recebido' then
    delete from public.transactions where source_type = 'receivable' and source_id = new.id;
    new.received_date := null;
    if new.recurrence <> 'none' then
      delete from public.receivables x
       where x.workspace_id = new.workspace_id and x.title = new.title
         and x.status in ('previsto', 'atrasado') and x.id <> new.id
         and x.expected_date = (new.expected_date + case new.recurrence when 'weekly' then interval '7 days'
                                                                        when 'monthly' then interval '1 month'
                                                                        else interval '1 year' end)::date;
    end if;
  end if;
  return new;
end $$;

-- Limpa lançamentos que sobraram de contas que foram desmarcadas como pagas antes desta correção.
delete from public.transactions t
 where t.source_type = 'payable'
   and exists (select 1 from public.payables p where p.id = t.source_id and p.status <> 'pago');
delete from public.transactions t
 where t.source_type = 'receivable'
   and exists (select 1 from public.receivables r where r.id = t.source_id and r.status <> 'recebido');

-- 4. Amortizar dívida ---------------------------------------------------------------------------------
/** Paga um valor de uma dívida: abate das parcelas em aberto, da mais antiga para a mais nova. */
create or replace function public.debt_pay(_debt uuid, _amount numeric, _date date default current_date, _account uuid default null)
returns numeric language plpgsql as $$
declare
  p public.payables%rowtype;
  rest numeric(14,2) := round(_amount, 2);
  owed numeric(14,2);
  part numeric(14,2);
begin
  if rest <= 0 then raise exception 'Informe um valor maior que zero.'; end if;
  select coalesce(sum(amount - paid_amount), 0) into owed from public.payables
   where debt_id = _debt and status in ('pendente', 'atrasado', 'parcial');
  if rest > owed + 0.001 then
    raise exception 'O valor passa do que falta pagar desta dívida (falta %).', to_char(owed, 'FM999G999G990D00');
  end if;
  for p in select * from public.payables where debt_id = _debt and status in ('pendente', 'atrasado', 'parcial')
           order by due_date, installment_number loop
    exit when rest <= 0;
    part := least(rest, p.amount - p.paid_amount);
    if part > 0 then
      insert into public.payable_payments (workspace_id, payable_id, amount, date, account_id)
      values (p.workspace_id, p.id, part, coalesce(_date, current_date), _account);
      rest := rest - part;
    end if;
  end loop;
  update public.debts set status = 'quitada'
   where id = _debt and not exists (select 1 from public.payables where debt_id = _debt and status in ('pendente', 'atrasado', 'parcial'));
  return owed - round(_amount, 2);
end $$;
revoke execute on function public.debt_pay(uuid, numeric, date, uuid) from public, anon;
grant execute on function public.debt_pay(uuid, numeric, date, uuid) to authenticated;
