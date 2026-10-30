import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { MonthNav } from "@/components/finance/MonthNav";
import { TransactionDialog } from "@/components/finance/TransactionDialog";
import {
  BusinessResults, CategoryBreakdown, Delta, KpiRow, TrendChart, UpcomingCard, type DueItem, type OverviewKpi,
} from "@/components/finance/overview/OverviewCards";
import {
  useAccounts, useAllPaidTransactions, useCategories, usePayables, useReceivables, useTransactionsRange,
} from "@/hooks/useFinance";
import { useMonthParam } from "@/hooks/useMonthParam";
import { useWorkspace } from "@/lib/workspace";
import { accountBalance } from "@/lib/finance";
import { localISODate, shiftMonth } from "@/lib/format";
import { businessResults, monthSeries, spendByCategory, type MonthPoint } from "@/lib/overview";
import { sumAmount } from "@/lib/transactions";

function overviewKpis(cur: MonthPoint, prev: MonthPoint, saldoContas: number, accountCount: number): OverviewKpi[] {
  const saldoMes = cur.Entradas - cur.Saídas;
  return [
    { label: "Entradas", v: cur.Entradas, extra: <Delta now={cur.Entradas} before={prev.Entradas} />, tone: "text-success" },
    { label: "Saídas", v: cur.Saídas, extra: <Delta now={cur.Saídas} before={prev.Saídas} inverse />, tone: "" },
    { label: "Resultado do mês", v: saldoMes, extra: <span className="text-xs text-muted-foreground">{cur.Entradas ? `${Math.round((saldoMes / cur.Entradas) * 100)}% das entradas` : " "}</span>, tone: saldoMes < 0 ? "text-destructive" : "text-success" },
    { label: "Saldo em contas", v: saldoContas, extra: <Link to="/financeiro/carteira" className="text-xs text-primary hover:underline">{accountCount ? `${accountCount} conta(s)` : "Cadastrar contas"}</Link>, tone: saldoContas < 0 ? "text-destructive" : "" },
  ];
}

/** Contas a pagar e a receber dos próximos 7 dias (inclui atrasadas). */
function useUpcoming() {
  const { data: payables = [] } = usePayables();
  const { data: receivables = [] } = useReceivables();
  const in7 = localISODate(new Date(Date.now() + 7 * 864e5));
  const dueSoon: DueItem[] = payables.filter((p) => p.status !== "pago" && p.due_date <= in7).slice(0, 6)
    .map((p) => ({ id: p.id, title: p.title, date: p.due_date, amount: Number(p.amount) }));
  const toReceive: DueItem[] = receivables.filter((r) => r.status !== "recebido" && r.expected_date <= in7).slice(0, 6)
    .map((r) => ({ id: r.id, title: r.title, date: r.expected_date, amount: Number(r.amount) }));
  return { dueSoon, toReceive };
}

export default function VisaoGeral() {
  const [ym, setYm] = useMonthParam();
  const first = shiftMonth(ym, -5);
  const { data: txs = [], isLoading } = useTransactionsRange(first, ym);
  const { data: allPaid = [] } = useAllPaidTransactions();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { businesses, businessFilter } = useWorkspace();
  const { dueSoon, toReceive } = useUpcoming();
  const [dlg, setDlg] = useState(false);

  const months = useMemo(() => Array.from({ length: 6 }, (_, i) => shiftMonth(first, i)), [first]);
  const series = useMemo(() => monthSeries(months, txs), [months, txs]);
  const [prev, cur] = [series[4], series[5]];
  const saldoContas = accounts.reduce((a, acc) => a + accountBalance(acc, allPaid), 0);

  const monthTx = txs.filter((t) => t.date.startsWith(ym));
  const byCategory = useMemo(() => spendByCategory(monthTx, categories), [monthTx, categories]);
  const essential = sumAmount(monthTx.filter((t) => t.type === "saida" && t.essential));
  const byBusiness = useMemo(() => businessResults(businesses, monthTx), [businesses, monthTx]);
  const today = localISODate();

  return (
    <div>
      <PageHeader eyebrow="Financeiro" title="Visão geral" description="Como está o dinheiro: mês atual, tendência e o que vence."
        actions={<><MonthNav value={ym} onChange={setYm} /><Button onClick={() => setDlg(true)}><Plus className="size-4" />Lançamento</Button></>} />

      <KpiRow kpis={overviewKpis(cur, prev, saldoContas, accounts.length)} loading={isLoading} />

      <div className="grid gap-4 lg:grid-cols-3">
        <TrendChart series={series} />
        <CategoryBreakdown items={byCategory} totalOut={cur.Saídas} essential={essential} />

        {businessFilter === "all" && byBusiness.length > 0 && <BusinessResults items={byBusiness} />}

        <UpcomingCard title="A pagar (7 dias)" link="/financeiro/contas?tipo=pagar" empty="Nada vencendo."
          items={dueSoon} today={today} amountTone="text-muted-foreground" />
        <UpcomingCard title="A receber (7 dias)" link="/financeiro/contas?tipo=receber" empty="Nada previsto."
          items={toReceive} today={today} amountTone="text-success" className="lg:col-span-2" />
      </div>

      <TransactionDialog open={dlg} onOpenChange={setDlg} />
    </div>
  );
}
