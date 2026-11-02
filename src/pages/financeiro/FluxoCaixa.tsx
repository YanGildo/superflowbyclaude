import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { MonthNav } from "@/components/finance/MonthNav";
import { CashCalendar } from "@/components/finance/cashflow/CashCalendar";
import { DayDialog } from "@/components/finance/cashflow/DayDialog";
import { useCashflow } from "@/hooks/useCashflow";
import { useMonthParam } from "@/hooks/useMonthParam";
import type { CashDay, CashSummary } from "@/lib/cashflow";
import { brl } from "@/lib/format";
import { shortDate } from "@/lib/labels";
import { cn } from "@/lib/utils";

function Stat({ label, value, tone, hint }: { label: string; value: string; tone?: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("font-heading text-xl font-semibold tabular-nums", tone)}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function Summary({ s, accounts }: { s: CashSummary; accounts: number }) {
  const neg = (v: number | null) => (v != null && v < 0 ? "text-destructive" : undefined);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Resumo do mês">
      <Stat label="Saldo hoje" value={brl(s.today)} tone={neg(s.today)} hint={accounts ? `${accounts} conta(s)` : "cadastre suas contas"} />
      <Stat label="A entrar no mês" value={brl(s.in)} tone="text-success" hint="de hoje em diante" />
      <Stat label="A sair no mês" value={brl(s.out)} tone="text-destructive" hint="inclui atrasadas e fatura" />
      <Stat label="Saldo final projetado" value={s.final == null ? "—" : brl(s.final)} tone={neg(s.final)} />
      <Stat label="Dia mais apertado" value={s.lowest ? brl(s.lowest.balance) : "—"} tone={neg(s.lowest?.balance ?? null)} hint={s.lowest ? shortDate(s.lowest.date) : undefined} />
    </div>
  );
}

/** Calendário de fluxo de caixa: quando o dinheiro vai apertar, antes de apertar. */
export default function FluxoCaixa() {
  const [ym, setYm] = useMonthParam();
  const c = useCashflow(ym);
  const [day, setDay] = useState<CashDay | null>(null);
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Financeiro" title="Fluxo de caixa" description="Saldo projetado dia a dia com as contas a pagar e receber (e as que se repetem)."
        actions={<MonthNav value={ym} onChange={setYm} />} />
      <Summary s={c.summary} accounts={c.accountCount} />
      {c.summary.negativeDays > 0 && (
        <p className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          <AlertTriangle className="size-4" />O saldo fica negativo em {c.summary.negativeDays} dia(s) deste mês. Os dias em vermelho mostram onde.
        </p>
      )}
      <CashCalendar weeks={c.weeks} onOpen={setDay} />
      <p className="text-xs text-muted-foreground">
        Começa no saldo atual de todas as contas. Contas atrasadas entram hoje. Repetições futuras e a fatura atual do cartão são estimativas (não viram registro).
        Para mudar valores, use <Link to="/financeiro/contas" className="text-primary hover:underline">Pagar e receber</Link>.
      </p>
      <DayDialog day={day} onClose={() => setDay(null)} />
    </div>
  );
}
