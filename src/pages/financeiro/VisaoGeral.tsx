import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SimpleSelect } from "@/components/common/RefSelect";
import { MonthNav } from "@/components/finance/MonthNav";
import { BusinessResults, TrendChart, UpcomingCard, type DueItem } from "@/components/finance/overview/OverviewCards";
import { FinGoalsSection } from "@/components/finance/goals/FinGoalsSection";
import { PanelActions } from "@/components/finance/panel/PanelActions";
import { AllocationCard, BillsFlowCard, RemainingCard } from "@/components/finance/panel/PanelCharts";
import { ICONS } from "@/components/finance/panel/icons";
import { PanelKpis, type PanelKpi } from "@/components/finance/panel/PanelKpis";
import { useFinPanel } from "@/hooks/useFinPanel";
import { useMonthParam } from "@/hooks/useMonthParam";
import { useAuth } from "@/lib/auth";
import { ORIGIN_OPTIONS, USE_OPTIONS, type OriginFilter, type UseFilter } from "@/lib/finPanel";
import { brl, localISODate, monthLabel, shiftMonth } from "@/lib/format";
import { businessResults, monthSeries } from "@/lib/overview";
import { useWorkspace } from "@/lib/workspace";

type Panel = ReturnType<typeof useFinPanel>;
const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? "" : "s"}`;

function kpis(p: Panel): PanelKpi[] {
  const { flow, prevFlow, reserves, bills } = p;
  const estimate = flow.restante - reserves.thisMonth;
  return [
    { label: "Entradas", value: flow.entradas, prev: prevFlow.entradas, icon: ICONS.in, tone: "green", to: "/financeiro/lancamentos" },
    { label: "Saídas", value: flow.saidas, prev: prevFlow.saidas, icon: ICONS.out, tone: "red", to: "/financeiro/lancamentos" },
    { label: "Reservas", value: reserves.total, hint: `Guardado no mês: ${brl(reserves.thisMonth)}`, icon: ICONS.reserve, tone: "blue", to: "/financeiro/reservas" },
    { label: "Uso débito / conta", value: flow.debito, prev: prevFlow.debito, icon: ICONS.debit, tone: "cyan" },
    { label: "Uso crédito", value: flow.credito, prev: prevFlow.credito, icon: ICONS.credit, tone: "violet", to: "/financeiro/carteira" },
    { label: "Restante", value: flow.restante, hint: "Entradas − saídas", prev: prevFlow.restante, icon: ICONS.left, tone: "green" },
    { label: "Saldo estimado", value: estimate, hint: "Restante − guardado nas reservas este mês", icon: ICONS.estimate, tone: "violet" },
    { label: `Contas no mês (${bills.month.n})`, value: bills.month.v, icon: ICONS.bills, tone: "red", to: "/financeiro/contas?tipo=pagar" },
    { label: `Vencimentos 7 dias (${bills.next7.n})`, value: bills.next7.v, icon: ICONS.due, tone: "blue", to: "/financeiro/contas?tipo=pagar" },
    { label: `Atrasadas (${bills.late.n})`, value: bills.late.v, icon: ICONS.late, tone: "red", to: "/financeiro/contas?tipo=pagar" },
    { label: `Dívidas ativas (${bills.debts.n})`, value: bills.debts.v, hint: "Parcelas que faltam pagar", icon: ICONS.debt, tone: "amber", to: "/financeiro/carteira" },
    { label: "Pró-labore no mês", value: p.proLabore, hint: "Retirado do negócio para o pessoal", icon: ICONS.pro, tone: "cyan" },
  ];
}

function Hero({ ym, setYm, balance, accountCount }: { ym: string; setYm: (v: string) => void; balance: number; accountCount: number }) {
  const { user } = useAuth();
  const name = ((user?.user_metadata?.full_name as string | undefined) ?? "").split(" ")[0];
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success"><Sparkles className="size-3.5" />Painel financeiro</span>
        <h1 className="mt-2 font-heading text-2xl font-semibold">Bem-vindo{name ? `, ${name}` : ""}!</h1>
        <p className="text-sm capitalize text-muted-foreground">{today}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <MonthNav value={ym} onChange={setYm} />
        <Link to="/financeiro/carteira" className="text-sm text-muted-foreground hover:text-foreground">
          Saldo em contas: <b className={balance < 0 ? "text-destructive" : "text-foreground"}>{brl(balance)}</b> · {plural(accountCount, "conta")}
        </Link>
      </div>
    </div>
  );
}

function Upcoming({ p }: { p: Panel }) {
  const today = localISODate();
  const in7 = localISODate(new Date(Date.now() + 7 * 864e5));
  const dueSoon: DueItem[] = p.payables.filter((x) => x.status !== "pago" && x.due_date <= in7).slice(0, 6)
    .map((x) => ({ id: x.id, title: x.title, date: x.due_date, amount: Number(x.amount) }));
  const toReceive: DueItem[] = p.receivables.filter((x) => x.status !== "recebido" && x.expected_date <= in7).slice(0, 6)
    .map((x) => ({ id: x.id, title: x.title, date: x.expected_date, amount: Number(x.amount) }));
  return (
    <>
      <UpcomingCard title="A pagar (7 dias)" link="/financeiro/contas?tipo=pagar" empty="Nada vencendo." items={dueSoon} today={today} amountTone="text-muted-foreground" />
      <UpcomingCard title="A receber (7 dias)" link="/financeiro/contas?tipo=receber" empty="Nada previsto." items={toReceive} today={today} amountTone="text-success" />
    </>
  );
}

export default function VisaoGeral() {
  const [ym, setYm] = useMonthParam();
  const [use, setUse] = useState<UseFilter>("todos");
  const [origin, setOrigin] = useState<OriginFilter>("todas");
  const p = useFinPanel(ym, use, origin);
  const { businesses, businessFilter } = useWorkspace();
  const series = useMemo(() => monthSeries(Array.from({ length: 6 }, (_, i) => shiftMonth(ym, i - 5)), p.txs), [ym, p.txs]);
  const byBusiness = useMemo(() => businessResults(businesses, p.curAll), [businesses, p.curAll]);

  return (
    <div className="space-y-5">
      <Card className="space-y-4 bg-gradient-to-br from-success/10 via-card to-brand-cyan/10 p-5">
        <Hero ym={ym} setYm={setYm} balance={p.balance} accountCount={p.accountCount} />
        <PanelActions />
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtrar:</span>
          <div className="w-44"><SimpleSelect<UseFilter> value={use} onChange={setUse} options={USE_OPTIONS} /></div>
          <div className="w-56"><SimpleSelect<OriginFilter> value={origin} onChange={setOrigin} options={ORIGIN_OPTIONS} /></div>
          <span className="ml-auto text-xs text-muted-foreground">{monthLabel(ym)}</span>
        </div>
      </Card>

      <PanelKpis items={kpis(p)} loading={p.loading} />

      <div className="grid gap-4 lg:grid-cols-3">
        <RemainingCard entradas={p.flow.entradas} saidas={p.flow.saidas} />
        <BillsFlowCard data={p.billsFlow} />
        <AllocationCard data={p.allocation} />
      </div>

      <FinGoalsSection ym={ym} monthIncome={p.flow.entradas} />

      <div className="grid gap-4 lg:grid-cols-3">
        <TrendChart series={series} />
        <div className="space-y-4"><Upcoming p={p} /></div>
        {businessFilter === "all" && byBusiness.length > 0 && <BusinessResults items={byBusiness} />}
      </div>
    </div>
  );
}
