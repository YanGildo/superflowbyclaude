import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, CreditCard, Plus, Repeat2, Search, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { RefSelect } from "@/components/common/RefSelect";
import { MonthNav } from "@/components/finance/MonthNav";
import { TransactionDialog } from "@/components/finance/TransactionDialog";
import { useAccounts, useCards, useCategories, useFinMutations, useTransactions } from "@/hooks/useFinance";
import { useMonthParam } from "@/hooks/useMonthParam";
import { useWorkspace } from "@/lib/workspace";
import type { Transaction, TxType } from "@/integrations/supabase/types";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_FILTERS: { v: "todos" | TxType; label: string }[] = [
  { v: "todos", label: "Todos" }, { v: "entrada", label: "Entradas" }, { v: "saida", label: "Saídas" }, { v: "transferencia", label: "Transferências" },
];

export function Summary({ items }: { items: { label: string; value: number; tone?: "good" | "bad" | "muted"; hint?: string }[] }) {
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((i) => (
        <Card key={i.label}><CardContent className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{i.label}</p>
          <p className={cn("mt-1 font-heading text-xl font-semibold tabular-nums",
            i.tone === "good" && "text-success", i.tone === "bad" && "text-destructive", i.tone === "muted" && "text-muted-foreground")}>
            {brl(i.value)}
          </p>
          {i.hint && <p className="text-xs text-muted-foreground">{i.hint}</p>}
        </CardContent></Card>
      ))}
    </div>
  );
}

export default function Lancamentos() {
  const [ym, setYm] = useMonthParam();
  const { data: txs = [], isLoading } = useTransactions(ym);
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const { businesses } = useWorkspace();
  const { patch, remove } = useFinMutations("transactions");
  const [type, setType] = useState<"todos" | TxType>("todos");
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; tx?: Transaction | null; type?: TxType }>({ open: false });

  const filtered = useMemo(() => txs.filter((t) =>
    (type === "todos" || t.type === type) && (!cat || t.category_id === cat) &&
    (!q || t.description.toLowerCase().includes(q.toLowerCase()))), [txs, type, cat, q]);

  const paid = txs.filter((t) => t.status === "pago");
  const entradas = paid.filter((t) => t.type === "entrada").reduce((a, t) => a + Number(t.amount), 0);
  const saidas = paid.filter((t) => t.type === "saida").reduce((a, t) => a + Number(t.amount), 0);
  const pendente = txs.filter((t) => t.status === "pendente" && t.type !== "transferencia")
    .reduce((a, t) => a + (t.type === "entrada" ? 1 : -1) * Number(t.amount), 0);

  const byDate = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    filtered.forEach((t) => m.set(t.date, [...(m.get(t.date) ?? []), t]));
    return [...m.entries()];
  }, [filtered]);

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name;
  const accName = (id: string | null) => accounts.find((a) => a.id === id)?.name;
  const cardName = (id: string | null) => cards.find((c) => c.id === id)?.name;
  const biz = (id: string | null) => businesses.find((b) => b.id === id);

  return (
    <div>
      <PageHeader eyebrow="Financeiro" title="Lançamentos" description="Todas as entradas, saídas e transferências."
        actions={<>
          <MonthNav value={ym} onChange={setYm} />
          <Button variant="outline" onClick={() => setDialog({ open: true, tx: null, type: "entrada" })}><ArrowUpCircle className="size-4 text-success" />Entrada</Button>
          <Button onClick={() => setDialog({ open: true, tx: null, type: "saida" })}><Plus className="size-4" />Saída</Button>
        </>} />

      <Summary items={[
        { label: "Entradas", value: entradas, tone: "good" },
        { label: "Saídas", value: saidas, tone: "bad" },
        { label: "Saldo do mês", value: entradas - saidas, tone: entradas - saidas < 0 ? "bad" : "good" },
        { label: "Pendente (líquido)", value: pendente, tone: "muted", hint: "Lançamentos ainda não pagos/recebidos" },
      ]} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border bg-card p-0.5" role="tablist" aria-label="Tipo">
          {TYPE_FILTERS.map((t) => (
            <button key={t.v} role="tab" aria-selected={type === t.v} onClick={() => setType(t.v)}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium", type === t.v ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>{t.label}</button>
          ))}
        </div>
        <div className="w-48"><RefSelect value={cat} onChange={setCat} options={categories} placeholder="Todas as categorias" /></div>
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar descrição" aria-label="Buscar lançamento" className="h-9 pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title={txs.length ? "Nada com esses filtros" : "Nenhum lançamento neste mês"}
          description="Registre entradas e saídas. Contas pagas, recebimentos e vendas entram aqui sozinhos."
          action={<Button onClick={() => setDialog({ open: true, tx: null, type: "saida" })}><Plus className="size-4" />Novo lançamento</Button>} />
      ) : (
        <div className="space-y-4">
          {byDate.map(([date, list]) => (
            <section key={date}>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                {new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
              </p>
              <div className="space-y-1.5">
                {list.map((t) => {
                  const Icon = t.type === "entrada" ? ArrowUpCircle : t.type === "saida" ? ArrowDownCircle : Repeat2;
                  const b = biz(t.business_id);
                  return (
                    <div key={t.id} className="group flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2.5 hover:border-primary/30"
                      onClick={() => setDialog({ open: true, tx: t })}>
                      <Icon className={cn("size-5 shrink-0", t.type === "entrada" ? "text-success" : t.type === "saida" ? "text-destructive" : "text-primary")} />
                      <div className="min-w-0 flex-1">
                        <button className="block max-w-full truncate text-left text-sm font-medium hover:underline"
                          onClick={(e) => { e.stopPropagation(); setDialog({ open: true, tx: t }); }}>{t.description}</button>
                        <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                          {catName(t.category_id) && <span>{catName(t.category_id)}</span>}
                          {t.card_id ? <span className="inline-flex items-center gap-1"><CreditCard className="size-3" />{cardName(t.card_id)}</span>
                            : accName(t.account_id) && <span className="inline-flex items-center gap-1"><Wallet className="size-3" />{accName(t.account_id)}{t.to_account_id && ` → ${accName(t.to_account_id)}`}</span>}
                          {b && <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full" style={{ background: b.color ?? "currentColor" }} />{b.name}</span>}
                          {t.source_type && <span>automático</span>}
                        </div>
                      </div>
                      {t.status === "pendente" && (
                        <Badge variant="outline" className="cursor-pointer text-warning" title="Marcar como pago"
                          onClick={(e) => { e.stopPropagation(); patch.mutate({ id: t.id, values: { status: "pago" } }); }}>pendente</Badge>
                      )}
                      <span className={cn("shrink-0 font-heading text-sm font-semibold tabular-nums",
                        t.type === "entrada" ? "text-success" : t.type === "saida" ? "text-foreground" : "text-muted-foreground")}>
                        {t.type === "saida" ? "−" : t.type === "entrada" ? "+" : ""}{brl(Number(t.amount))}
                      </span>
                      <Button size="icon" variant="ghost" className="size-8 shrink-0 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                        aria-label={`Excluir ${t.description}`} onClick={(e) => { e.stopPropagation(); remove.mutate(t.id); }}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <TransactionDialog open={dialog.open} tx={dialog.tx} defaultType={dialog.type}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />
    </div>
  );
}
