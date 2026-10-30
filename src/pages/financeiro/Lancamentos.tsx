import { useMemo, useState } from "react";
import { ArrowLeftRight, ArrowUpCircle, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { RefSelect } from "@/components/common/RefSelect";
import { MonthNav } from "@/components/finance/MonthNav";
import { Summary } from "@/components/finance/Summary";
import { TransactionDialog } from "@/components/finance/TransactionDialog";
import { TxRow, type TxNames } from "@/components/finance/TxRow";
import { useAccounts, useCards, useCategories, useFinMutations, useTransactions } from "@/hooks/useFinance";
import { useMonthParam } from "@/hooks/useMonthParam";
import { useWorkspace } from "@/lib/workspace";
import type { FinCategory, Transaction, TxType } from "@/integrations/supabase/types";
import { groupByDate, matchesTx, monthTotals, type TxFilter } from "@/lib/transactions";
import { cn } from "@/lib/utils";

const TYPE_FILTERS: { v: "todos" | TxType; label: string }[] = [
  { v: "todos", label: "Todos" }, { v: "entrada", label: "Entradas" }, { v: "saida", label: "Saídas" }, { v: "transferencia", label: "Transferências" },
];

type DialogState = { open: boolean; tx?: Transaction | null; type?: TxType };

function Filters({ f, setF, categories }: { f: TxFilter; setF: (f: TxFilter) => void; categories: FinCategory[] }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex gap-1 rounded-lg border bg-card p-0.5" role="tablist" aria-label="Tipo">
        {TYPE_FILTERS.map((t) => (
          <button key={t.v} role="tab" aria-selected={f.type === t.v} onClick={() => setF({ ...f, type: t.v })}
            className={cn("rounded-md px-3 py-1.5 text-xs font-medium", f.type === t.v ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>{t.label}</button>
        ))}
      </div>
      <div className="w-48"><RefSelect value={f.cat} onChange={(cat) => setF({ ...f, cat })} options={categories} placeholder="Todas as categorias" /></div>
      <div className="relative min-w-[180px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Buscar descrição" aria-label="Buscar lançamento" className="h-9 pl-9" />
      </div>
    </div>
  );
}

/** Nomes de categoria, conta, cartão e negócio a partir dos ids do lançamento. */
function useTxNames(): { names: TxNames; categories: FinCategory[] } {
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const { businesses } = useWorkspace();
  const names: TxNames = {
    category: (id) => categories.find((c) => c.id === id)?.name,
    account: (id) => accounts.find((a) => a.id === id)?.name,
    card: (id) => cards.find((c) => c.id === id)?.name,
    business: (id) => businesses.find((b) => b.id === id),
  };
  return { names, categories };
}

export default function Lancamentos() {
  const [ym, setYm] = useMonthParam();
  const { data: txs = [], isLoading } = useTransactions(ym);
  const { names, categories } = useTxNames();
  const { patch, remove } = useFinMutations("transactions");
  const [filter, setFilter] = useState<TxFilter>({ type: "todos", cat: null, q: "" });
  const [dialog, setDialog] = useState<DialogState>({ open: false });

  const filtered = useMemo(() => txs.filter((t) => matchesTx(t, filter)), [txs, filter]);
  const byDate = useMemo(() => groupByDate(filtered), [filtered]);
  const { entradas, saidas, pendente } = monthTotals(txs);
  const newTx = (type: TxType) => () => setDialog({ open: true, tx: null, type });

  const list = () => {
    if (isLoading) return <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>;
    if (filtered.length === 0) {
      return (
        <EmptyState icon={ArrowLeftRight} title={txs.length ? "Nada com esses filtros" : "Nenhum lançamento neste mês"}
          description="Registre entradas e saídas. Contas pagas, recebimentos e vendas entram aqui sozinhos."
          action={<Button onClick={newTx("saida")}><Plus className="size-4" />Novo lançamento</Button>} />
      );
    }
    return (
      <div className="space-y-4">
        {byDate.map(([date, items]) => (
          <section key={date}>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
              {new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
            </p>
            <div className="space-y-1.5">
              {items.map((t) => (
                <TxRow key={t.id} t={t} names={names} onOpen={() => setDialog({ open: true, tx: t })}
                  onMarkPaid={() => patch.mutate({ id: t.id, values: { status: "pago" } })} onRemove={() => remove.mutate(t.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div>
      <PageHeader eyebrow="Financeiro" title="Lançamentos" description="Todas as entradas, saídas e transferências."
        actions={<>
          <MonthNav value={ym} onChange={setYm} />
          <Button variant="outline" onClick={newTx("entrada")}><ArrowUpCircle className="size-4 text-success" />Entrada</Button>
          <Button onClick={newTx("saida")}><Plus className="size-4" />Saída</Button>
        </>} />

      <Summary items={[
        { label: "Entradas", value: entradas, tone: "good" },
        { label: "Saídas", value: saidas, tone: "bad" },
        { label: "Saldo do mês", value: entradas - saidas, tone: entradas - saidas < 0 ? "bad" : "good" },
        { label: "Pendente (líquido)", value: pendente, tone: "muted", hint: "Lançamentos ainda não pagos/recebidos" },
      ]} />

      <Filters f={filter} setF={setFilter} categories={categories} />

      {list()}

      <TransactionDialog open={dialog.open} tx={dialog.tx} defaultType={dialog.type}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />
    </div>
  );
}
