import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlarmClock, CalendarClock, CalendarDays, CheckCircle2, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { BillDialog } from "@/components/finance/BillDialog";
import { BillRow, type BillRowActions } from "@/components/finance/BillRow";
import { Summary } from "@/components/finance/Summary";
import { useCategories, useFinMutations, usePayables, useReceivables } from "@/hooks/useFinance";
import type { Payable, Receivable } from "@/integrations/supabase/types";
import type { BillKind } from "@/lib/billForm";
import { BILL_PAGE_TEXT, BILL_STATUS, splitOpen, sumBills, toBill, type Bill } from "@/lib/bills";
import { brl, localISODate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Show = "abertas" | "concluidas";
type Group = { id: string; title: string; icon: typeof AlarmClock; tone: string; list: Bill[] };

function Tabs({ kind, setKind, show, setShow, openCount, doneCount }: {
  kind: BillKind; setKind: (k: BillKind) => void; show: Show; setShow: (s: Show) => void; openCount: number; doneCount: number;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex gap-1 rounded-lg border bg-card p-0.5" role="tablist" aria-label="Tipo de conta">
        {(["pagar", "receber"] as BillKind[]).map((k) => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
            className={cn("rounded-md px-4 py-1.5 text-sm font-medium", kind === k ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
            A {k}
          </button>
        ))}
      </div>
      <div className="flex gap-1 rounded-lg border bg-card p-0.5" role="tablist" aria-label="Situação">
        {(["abertas", "concluidas"] as const).map((s) => (
          <button key={s} role="tab" aria-selected={show === s} onClick={() => setShow(s)}
            className={cn("rounded-md px-3 py-1.5 text-xs font-medium", show === s ? "bg-secondary" : "text-muted-foreground hover:bg-accent")}>
            {s === "abertas" ? `Em aberto (${openCount})` : `Concluídas (${doneCount})`}
          </button>
        ))}
      </div>
    </div>
  );
}

type RowProps = { kind: BillKind; today: string; catName: (id: string | null) => string | undefined; act: BillRowActions };

function OpenBills({ groups, onAdd, row }: { groups: Group[]; onAdd: () => void; row: RowProps }) {
  if (groups.every((g) => g.list.length === 0)) {
    return (
      <EmptyState icon={Receipt} title={`Nenhuma conta a ${row.kind} em aberto`} description={BILL_PAGE_TEXT[row.kind].emptyHint}
        action={<Button onClick={onAdd}><Plus className="size-4" />Adicionar</Button>} />
    );
  }
  return (
    <div className="space-y-6">
      {groups.filter((g) => g.list.length).map((g) => (
        <section key={g.id} className="space-y-2">
          <h2 className={cn("flex items-center gap-2 text-sm font-semibold", g.tone)}>
            <g.icon className="size-4" />{g.title}<span className="font-normal text-muted-foreground">· {brl(sumBills(g.list))}</span>
          </h2>
          <div className="space-y-1.5">{g.list.map((b) => <BillRow key={b.id} b={b} category={row.catName(b.category_id)} {...row} />)}</div>
        </section>
      ))}
    </div>
  );
}

function DoneBills({ done, row }: { done: Bill[]; row: RowProps }) {
  if (done.length === 0) return <EmptyState icon={CheckCircle2} title="Nada concluído ainda" />;
  return <div className="space-y-1.5">{done.slice(0, 100).map((b) => <BillRow key={b.id} b={b} category={row.catName(b.category_id)} {...row} />)}</div>;
}

function useBillActions(kind: BillKind, edit: (b: Bill) => void): BillRowActions {
  const payM = useFinMutations("payables");
  const recM = useFinMutations("receivables");
  const m = kind === "pagar" ? payM : recM;
  return {
    edit,
    settle: (b) => m.patch.mutate({ id: b.id, values: BILL_STATUS[kind].settle }, {
      onSuccess: () => toast.success(
        `${BILL_PAGE_TEXT[kind].settled} e lançada no financeiro.${b.recurrence !== "none" ? " A próxima já foi criada." : ""}`),
    }),
    reopen: (b) => m.patch.mutate({ id: b.id, values: BILL_STATUS[kind].reopen }),
    cancel: (b) => m.patch.mutate({ id: b.id, values: { status: "cancelado" } }),
    remove: (b) => m.remove.mutate(b.id),
  };
}

/** Contas separadas por situação e período (hoje, 7 dias, mês). */
function useBillBoard(data: unknown[] | undefined) {
  const today = localISODate();
  const in7 = localISODate(new Date(Date.now() + 7 * 864e5));
  const monthPrefix = today.slice(0, 7);
  const bills = useMemo(() => ((data ?? []) as (Payable | Receivable)[]).map(toBill), [data]);
  const open = bills.filter((b) => !b.done);
  const done = bills.filter((b) => b.done).sort((a, b) => b.date.localeCompare(a.date));
  return {
    today, open, done, ...splitOpen(open, today, in7),
    monthOpen: open.filter((b) => b.date.startsWith(monthPrefix) || b.date < today),
    monthDone: done.filter((b) => b.date.startsWith(monthPrefix)),
  };
}

export default function PagarReceber() {
  const [params, setParams] = useSearchParams();
  const kind: BillKind = params.get("tipo") === "receber" ? "receber" : "pagar";
  const setKind = (k: BillKind) => setParams((p) => { p.set("tipo", k); return p; }, { replace: true });
  const [show, setShow] = useState<Show>("abertas");
  const [dialog, setDialog] = useState<{ open: boolean; bill?: Payable | Receivable | null }>({ open: false });

  const pay = usePayables();
  const rec = useReceivables();
  const { data: categories = [] } = useCategories();
  const query = kind === "pagar" ? pay : rec;
  const text = BILL_PAGE_TEXT[kind];

  const { today, open, done, late, week, later, monthOpen, monthDone } = useBillBoard(query.data);
  const groups: Group[] = [
    { id: "atrasadas", title: "Atrasadas", icon: AlarmClock, tone: "text-destructive", list: late },
    { id: "semana", title: "Próximos 7 dias", icon: CalendarClock, tone: "text-primary", list: week },
    { id: "depois", title: "Depois", icon: CalendarDays, tone: "", list: later },
  ];

  const addNew = () => setDialog({ open: true, bill: null });
  const act = useBillActions(kind, (b) => setDialog({ open: true, bill: b.raw }));
  const row: RowProps = { kind, today, act, catName: (id) => categories.find((c) => c.id === id)?.name };

  return (
    <div>
      <PageHeader eyebrow="Financeiro" title="Pagar e receber" description="Contas com vencimento. Marque como paga/recebida e o lançamento é criado sozinho."
        actions={<Button onClick={addNew}><Plus className="size-4" />Nova conta a {kind}</Button>} />

      <Tabs kind={kind} setKind={setKind} show={show} setShow={setShow} openCount={open.length} doneCount={done.length} />

      <Summary items={[
        { label: text.monthOpen, value: sumBills(monthOpen), tone: kind === "pagar" ? "bad" : "good" },
        { label: "Atrasado", value: sumBills(late), tone: late.length ? "bad" : "muted" },
        { label: "Próximos 7 dias", value: sumBills(week), tone: "muted" },
        { label: text.monthDone, value: sumBills(monthDone), tone: "good" },
      ]} />

      {query.isLoading
        ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        : show === "abertas" ? <OpenBills groups={groups} onAdd={addNew} row={row} /> : <DoneBills done={done} row={row} />}

      <BillDialog open={dialog.open} kind={kind} bill={dialog.bill} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />
    </div>
  );
}
