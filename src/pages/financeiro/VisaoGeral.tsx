import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlarmClock, ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { MonthNav } from "@/components/finance/MonthNav";
import { TransactionDialog } from "@/components/finance/TransactionDialog";
import {
  useAccounts, useAllPaidTransactions, useCategories, usePayables, useReceivables, useTransactionsRange,
} from "@/hooks/useFinance";
import { useMonthParam } from "@/hooks/useMonthParam";
import { useWorkspace } from "@/lib/workspace";
import { accountBalance } from "@/lib/finance";
import { brl, localISODate, shiftMonth } from "@/lib/format";
import { shortDate } from "@/lib/labels";
import { cn } from "@/lib/utils";

const short = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
};
const compact = (n: number) => (Math.abs(n) >= 1000 ? `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : n.toLocaleString("pt-BR"));

function Delta({ now, before, inverse }: { now: number; before: number; inverse?: boolean }) {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  if (!pct) return <span className="text-xs text-muted-foreground">igual ao mês anterior</span>;
  const up = pct > 0, good = inverse ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", good ? "text-success" : "text-destructive")}><Icon className="size-3.5" />{Math.abs(pct)}% vs mês anterior</span>;
}

export default function VisaoGeral() {
  const [ym, setYm] = useMonthParam();
  const first = shiftMonth(ym, -5);
  const { data: txs = [], isLoading } = useTransactionsRange(first, ym);
  const { data: allPaid = [] } = useAllPaidTransactions();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { data: payables = [] } = usePayables();
  const { data: receivables = [] } = useReceivables();
  const { businesses, businessFilter } = useWorkspace();
  const [dlg, setDlg] = useState(false);

  const months = useMemo(() => Array.from({ length: 6 }, (_, i) => shiftMonth(first, i)), [first]);
  const series = useMemo(() => months.map((m) => {
    const inM = txs.filter((t) => t.date.startsWith(m));
    return {
      ym: m, mes: short(m),
      Entradas: inM.filter((t) => t.type === "entrada").reduce((a, t) => a + Number(t.amount), 0),
      Saídas: inM.filter((t) => t.type === "saida").reduce((a, t) => a + Number(t.amount), 0),
    };
  }), [months, txs]);

  const cur = series[5], prev = series[4];
  const saldoMes = cur.Entradas - cur.Saídas;
  const saldoContas = accounts.reduce((a, acc) => a + accountBalance(acc, allPaid), 0);

  const monthTx = txs.filter((t) => t.date.startsWith(ym));
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    monthTx.filter((t) => t.type === "saida").forEach((t) => m.set(t.category_id ?? "—", (m.get(t.category_id ?? "—") ?? 0) + Number(t.amount)));
    return [...m.entries()].map(([id, v]) => ({ name: categories.find((c) => c.id === id)?.name ?? "Sem categoria", v })).sort((a, b) => b.v - a.v).slice(0, 6);
  }, [monthTx, categories]);
  const essential = monthTx.filter((t) => t.type === "saida" && t.essential).reduce((a, t) => a + Number(t.amount), 0);

  const byBusiness = useMemo(() => businesses.map((b) => {
    const l = monthTx.filter((t) => t.business_id === b.id);
    const e = l.filter((t) => t.type === "entrada").reduce((a, t) => a + Number(t.amount), 0);
    const s = l.filter((t) => t.type === "saida").reduce((a, t) => a + Number(t.amount), 0);
    return { b, e, s, r: e - s };
  }).filter((x) => x.e || x.s), [businesses, monthTx]);

  const today = localISODate(), in7 = localISODate(new Date(Date.now() + 7 * 864e5));
  const dueSoon = payables.filter((p) => p.status !== "pago" && p.due_date <= in7).slice(0, 6);
  const toReceive = receivables.filter((r) => r.status !== "recebido" && r.expected_date <= in7).slice(0, 6);

  return (
    <div>
      <PageHeader eyebrow="Financeiro" title="Visão geral" description="Como está o dinheiro: mês atual, tendência e o que vence."
        actions={<><MonthNav value={ym} onChange={setYm} /><Button onClick={() => setDlg(true)}><Plus className="size-4" />Lançamento</Button></>} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Entradas", v: cur.Entradas, extra: <Delta now={cur.Entradas} before={prev.Entradas} />, tone: "text-success" },
          { label: "Saídas", v: cur.Saídas, extra: <Delta now={cur.Saídas} before={prev.Saídas} inverse />, tone: "" },
          { label: "Resultado do mês", v: saldoMes, extra: <span className="text-xs text-muted-foreground">{cur.Entradas ? `${Math.round((saldoMes / cur.Entradas) * 100)}% das entradas` : " "}</span>, tone: saldoMes < 0 ? "text-destructive" : "text-success" },
          { label: "Saldo em contas", v: saldoContas, extra: <Link to="/financeiro/carteira" className="text-xs text-primary hover:underline">{accounts.length ? `${accounts.length} conta(s)` : "Cadastrar contas"}</Link>, tone: saldoContas < 0 ? "text-destructive" : "" },
        ].map((k) => (
          <Card key={k.label}><CardContent className="space-y-1 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{k.label}</p>
            {isLoading ? <Skeleton className="h-7 w-28" /> : <p className={cn("font-heading text-2xl font-semibold tabular-nums", k.tone)}>{brl(k.v)}</p>}
            {k.extra}
          </CardContent></Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Entradas x saídas · 6 meses</CardTitle></CardHeader>
          <CardContent className="h-64 pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} barGap={4} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={compact} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(v: number) => brl(v)}
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="Entradas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Saídas" fill="hsl(var(--brand-blue))" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="flex gap-4 px-6 pb-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-success" />Entradas</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-brand-blue" />Saídas</span>
          </div>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Para onde foi o dinheiro</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {byCategory.length === 0 ? <p className="text-sm text-muted-foreground">Sem saídas neste mês.</p> : byCategory.map((c) => (
              <div key={c.name} className="space-y-1">
                <div className="flex justify-between text-sm"><span className="truncate">{c.name}</span><span className="tabular-nums text-muted-foreground">{brl(c.v)}</span></div>
                <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(c.v / byCategory[0].v) * 100}%` }} /></div>
              </div>
            ))}
            {cur.Saídas > 0 && <p className="pt-1 text-xs text-muted-foreground">Gastos essenciais: {brl(essential)} ({Math.round((essential / cur.Saídas) * 100)}% das saídas)</p>}
          </CardContent>
        </Card>

        {businessFilter === "all" && byBusiness.length > 0 && (
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2"><CardTitle className="text-base">Resultado por negócio</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {byBusiness.map(({ b, e, s, r }) => (
                <div key={b.id} className="rounded-lg border p-3">
                  <p className="flex items-center gap-2 text-sm font-medium"><span className="size-2 rounded-full" style={{ background: b.color ?? "currentColor" }} />{b.name}</p>
                  <p className={cn("mt-1 font-heading text-lg font-semibold tabular-nums", r < 0 ? "text-destructive" : "text-success")}>{brl(r)}</p>
                  <p className="text-xs text-muted-foreground">+{brl(e)} / −{brl(s)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">A pagar (7 dias)</CardTitle>
            <Link to="/financeiro/contas?tipo=pagar" className="text-xs text-primary hover:underline">Ver tudo</Link>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {dueSoon.length === 0 ? <p className="text-sm text-muted-foreground">Nada vencendo.</p> : dueSoon.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-1.5 truncate">{p.due_date < today && <AlarmClock className="size-3.5 shrink-0 text-destructive" />}{p.title}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{shortDate(p.due_date)} · {brl(Number(p.amount))}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">A receber (7 dias)</CardTitle>
            <Link to="/financeiro/contas?tipo=receber" className="text-xs text-primary hover:underline">Ver tudo</Link>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {toReceive.length === 0 ? <p className="text-sm text-muted-foreground">Nada previsto.</p> : toReceive.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-1.5 truncate">{r.expected_date < today && <AlarmClock className="size-3.5 shrink-0 text-destructive" />}{r.title}</span>
                <span className="shrink-0 tabular-nums text-success">{shortDate(r.expected_date)} · {brl(Number(r.amount))}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <TransactionDialog open={dlg} onOpenChange={setDlg} />
    </div>
  );
}
