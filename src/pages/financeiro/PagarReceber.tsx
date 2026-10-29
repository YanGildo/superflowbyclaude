import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlarmClock, CalendarClock, CalendarDays, Check, CheckCircle2, MoreHorizontal, Plus, Receipt, Repeat } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { BillDialog, BILL_RECURRENCE } from "@/components/finance/BillDialog";
import { Summary } from "./Lancamentos";
import { useCategories, useFinMutations, usePayables, useReceivables } from "@/hooks/useFinance";
import type { Payable, Receivable } from "@/integrations/supabase/types";
import { brl, localISODate } from "@/lib/format";
import { shortDate } from "@/lib/labels";
import { cn } from "@/lib/utils";

type Kind = "pagar" | "receber";
interface Bill { id: string; title: string; amount: number; date: string; done: boolean; recurrence: Payable["recurrence"]; category_id: string | null; installment?: string; raw: Payable | Receivable }

const toBill = (b: Payable | Receivable): Bill => "due_date" in b
  ? { id: b.id, title: b.title, amount: Number(b.amount), date: b.due_date, done: b.status === "pago", recurrence: b.recurrence, category_id: b.category_id, raw: b }
  : { id: b.id, title: b.title, amount: Number(b.amount), date: b.expected_date, done: b.status === "recebido", recurrence: b.recurrence, category_id: b.category_id, raw: b };

export default function PagarReceber() {
  const [params, setParams] = useSearchParams();
  const kind: Kind = params.get("tipo") === "receber" ? "receber" : "pagar";
  const setKind = (k: Kind) => setParams((p) => { p.set("tipo", k); return p; }, { replace: true });
  const [show, setShow] = useState<"abertas" | "concluidas">("abertas");
  const [dialog, setDialog] = useState<{ open: boolean; bill?: Payable | Receivable | null }>({ open: false });

  const pay = usePayables();
  const rec = useReceivables();
  const { data: categories = [] } = useCategories();
  const payM = useFinMutations("payables");
  const recM = useFinMutations("receivables");
  const m = kind === "pagar" ? payM : recM;
  const query = kind === "pagar" ? pay : rec;

  const today = localISODate();
  const in7 = localISODate(new Date(Date.now() + 7 * 864e5));
  const monthPrefix = today.slice(0, 7);
  const bills = useMemo(() => ((query.data ?? []) as (Payable | Receivable)[]).map(toBill), [query.data]);
  const open = bills.filter((b) => !b.done);
  const done = bills.filter((b) => b.done).sort((a, b) => b.date.localeCompare(a.date));

  const sum = (l: Bill[]) => l.reduce((a, b) => a + b.amount, 0);
  const groups = [
    { id: "atrasadas", title: "Atrasadas", icon: AlarmClock, tone: "text-destructive", list: open.filter((b) => b.date < today) },
    { id: "semana", title: "Próximos 7 dias", icon: CalendarClock, tone: "text-primary", list: open.filter((b) => b.date >= today && b.date <= in7) },
    { id: "depois", title: "Depois", icon: CalendarDays, tone: "", list: open.filter((b) => b.date > in7) },
  ];

  const settle = (b: Bill) => {
    const values = kind === "pagar" ? { status: "pago" } : { status: "recebido" };
    m.patch.mutate({ id: b.id, values }, {
      onSuccess: () => toast.success(
        `${kind === "pagar" ? "Paga" : "Recebida"} e lançada no financeiro.${b.recurrence !== "none" ? " A próxima já foi criada." : ""}`),
    });
  };
  const reopen = (b: Bill) => m.patch.mutate({ id: b.id, values: kind === "pagar" ? { status: "pendente", paid_date: null } : { status: "previsto", received_date: null } });
  const cancel = (b: Bill) => m.patch.mutate({ id: b.id, values: { status: "cancelado" } });

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name;

  const Row = ({ b }: { b: Bill }) => {
    const late = !b.done && b.date < today;
    const p = b.raw as Payable;
    return (
      <div className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setDialog({ open: true, bill: b.raw })}>
          <p className={cn("truncate text-sm font-medium", b.done && "text-muted-foreground line-through")}>{b.title}</p>
          <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
            <span className={cn(late && "font-medium text-destructive")}>
              {b.done ? "Concluída" : late ? `Venceu ${shortDate(b.date)}` : b.date === today ? "Vence hoje" : `Vence ${shortDate(b.date)}`}
            </span>
            {catName(b.category_id) && <span>{catName(b.category_id)}</span>}
            {b.recurrence !== "none" && <span className="inline-flex items-center gap-1"><Repeat className="size-3" />{BILL_RECURRENCE[b.recurrence]}</span>}
            {p.installment_number && <span>Parcela {p.installment_number}</span>}
          </div>
        </div>
        <span className={cn("font-heading text-sm font-semibold tabular-nums", kind === "receber" && "text-success")}>{brl(b.amount)}</span>
        {!b.done ? (
          <Button size="sm" variant="outline" onClick={() => settle(b)} aria-label={`${kind === "pagar" ? "Pagar" : "Receber"} ${b.title}`}>
            <Check className="size-4" />{kind === "pagar" ? "Pagar" : "Receber"}
          </Button>
        ) : <Badge variant="secondary" className="text-success"><CheckCircle2 className="mr-1 size-3" />ok</Badge>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="size-8" aria-label={`Mais ações para ${b.title}`}><MoreHorizontal className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDialog({ open: true, bill: b.raw })}>Editar</DropdownMenuItem>
            {b.done && <DropdownMenuItem onClick={() => reopen(b)}>Reabrir</DropdownMenuItem>}
            {!b.done && <DropdownMenuItem onClick={() => cancel(b)}>Cancelar (não vai acontecer)</DropdownMenuItem>}
            <DropdownMenuItem className="text-destructive" onClick={() => m.remove.mutate(b.id)}>Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const monthOpen = open.filter((b) => b.date.startsWith(monthPrefix) || b.date < today);
  const monthDone = done.filter((b) => b.date.startsWith(monthPrefix));

  return (
    <div>
      <PageHeader eyebrow="Financeiro" title="Pagar e receber" description="Contas com vencimento. Marque como paga/recebida e o lançamento é criado sozinho."
        actions={<Button onClick={() => setDialog({ open: true, bill: null })}><Plus className="size-4" />Nova conta a {kind}</Button>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border bg-card p-0.5" role="tablist" aria-label="Tipo de conta">
          {(["pagar", "receber"] as Kind[]).map((k) => (
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
              {s === "abertas" ? `Em aberto (${open.length})` : `Concluídas (${done.length})`}
            </button>
          ))}
        </div>
      </div>

      <Summary items={[
        { label: kind === "pagar" ? "A pagar neste mês" : "A receber neste mês", value: sum(monthOpen), tone: kind === "pagar" ? "bad" : "good" },
        { label: "Atrasado", value: sum(groups[0].list), tone: groups[0].list.length ? "bad" : "muted" },
        { label: "Próximos 7 dias", value: sum(groups[1].list), tone: "muted" },
        { label: kind === "pagar" ? "Pago no mês" : "Recebido no mês", value: sum(monthDone), tone: "good" },
      ]} />

      {query.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : show === "abertas" ? (
        open.length === 0 ? (
          <EmptyState icon={Receipt} title={`Nenhuma conta a ${kind} em aberto`}
            description={kind === "pagar" ? "Cadastre aluguel, ferramentas, parcelas... Contas mensais se recriam sozinhas." : "Propostas aprovadas no Comercial vão gerar as mensalidades aqui."}
            action={<Button onClick={() => setDialog({ open: true, bill: null })}><Plus className="size-4" />Adicionar</Button>} />
        ) : (
          <div className="space-y-6">
            {groups.filter((g) => g.list.length).map((g) => (
              <section key={g.id} className="space-y-2">
                <h2 className={cn("flex items-center gap-2 text-sm font-semibold", g.tone)}>
                  <g.icon className="size-4" />{g.title}<span className="font-normal text-muted-foreground">· {brl(sum(g.list))}</span>
                </h2>
                <div className="space-y-1.5">{g.list.map((b) => <Row key={b.id} b={b} />)}</div>
              </section>
            ))}
          </div>
        )
      ) : done.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nada concluído ainda" />
      ) : (
        <div className="space-y-1.5">{done.slice(0, 100).map((b) => <Row key={b.id} b={b} />)}</div>
      )}

      <BillDialog open={dialog.open} kind={kind} bill={dialog.bill} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />
    </div>
  );
}
