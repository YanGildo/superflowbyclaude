import type { LucideIcon } from "lucide-react";
import {
  ListTodo, AlarmClock, TrendingUp, TrendingDown, Users, Repeat, FileText,
  PackageX, Receipt, Zap, ShoppingCart, DollarSign,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace";
import { useDashboardKpis, type DashboardKpis } from "@/hooks/useDashboardKpis";
import { brl, greeting } from "@/lib/format";
import { FEATURES } from "@/lib/features";
import { cn } from "@/lib/utils";

interface Kpi {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "good" | "bad";
  hint?: string;
}

const TONE_ICON: Record<NonNullable<Kpi["tone"]>, string> = {
  bad: "bg-destructive/10 text-destructive",
  good: "bg-success/10 text-success",
  default: "bg-primary/10 text-primary",
};

function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-3 p-4">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", TONE_ICON[kpi.tone ?? "default"])}>
          <kpi.icon className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{kpi.label}</p>
          <p className={cn("mt-1 font-heading text-2xl font-semibold tabular-nums",
            kpi.tone === "bad" && "text-destructive")}>
            {kpi.value}
          </p>
          {kpi.hint && <p className="mt-0.5 text-xs text-muted-foreground">{kpi.hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, kpis, loading }: { title: string; kpis: Kpi[]; loading: boolean }) {
  return (
    <section className="space-y-3">
      <h2 className="brand-eyebrow">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? kpis.map((k) => <Skeleton key={k.label} className="h-[92px] rounded-xl" />)
          : kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>
    </section>
  );
}

const ZERO: DashboardKpis = {
  tarefasHoje: 0, tarefasAtrasadas: 0, entradasMes: 0, saidasMes: 0, clientesAtivos: 0, receitaRecorrente: 0,
  propostasAbertas: 0, entregasAtrasadas: 0, contasVencendo: 0, tgStartsHoje: 0, tgVendasHoje: 0, tgFaturamentoHoje: 0,
};

const alertTone = (v: number): Kpi["tone"] => (v ? "bad" : "default");

/** Bloco de vendas do Telegram (só aparece com o módulo ligado). */
function telegramSection(k: DashboardKpis): { title: string; kpis: Kpi[] } {
  const ticket = k.tgVendasHoje > 0 ? k.tgFaturamentoHoje / k.tgVendasHoje : 0;
  return { title: "Vendas Telegram · hoje", kpis: [
      { label: "Starts", value: String(k.tgStartsHoje), icon: Zap },
      { label: "Vendas aprovadas", value: String(k.tgVendasHoje), icon: ShoppingCart },
      { label: "Faturamento", value: brl(k.tgFaturamentoHoje), icon: DollarSign, tone: "good" },
      { label: "Ticket médio", value: brl(ticket), icon: TrendingUp },
    ] };
}

/** Os blocos de números do painel. Sem dados ainda, tudo aparece zerado. */
function buildSections(k: DashboardKpis): { title: string; kpis: Kpi[] }[] {
  const saldo = k.entradasMes - k.saidasMes;
  const sections: { title: string; kpis: Kpi[] }[] = [
    { title: "Hoje", kpis: [
      { label: "Tarefas de hoje", value: String(k.tarefasHoje), icon: ListTodo },
      { label: "Tarefas atrasadas", value: String(k.tarefasAtrasadas), icon: AlarmClock, tone: alertTone(k.tarefasAtrasadas) },
      { label: "Contas vencendo (7 dias)", value: String(k.contasVencendo), icon: Receipt, tone: alertTone(k.contasVencendo) },
      { label: "Entregas atrasadas", value: String(k.entregasAtrasadas), icon: PackageX, tone: alertTone(k.entregasAtrasadas) },
    ] },
    { title: "Financeiro do mês", kpis: [
      { label: "Entradas", value: brl(k.entradasMes), icon: TrendingUp, tone: "good" },
      { label: "Saídas", value: brl(k.saidasMes), icon: TrendingDown },
      { label: "Saldo", value: brl(saldo), icon: DollarSign, tone: saldo < 0 ? "bad" : "good" },
      { label: "Receita recorrente", value: brl(k.receitaRecorrente), icon: Repeat, hint: "Mensalidades de clientes ativos" },
    ] },
    { title: "Comercial", kpis: [
      { label: "Clientes ativos", value: String(k.clientesAtivos), icon: Users },
      { label: "Propostas em aberto", value: String(k.propostasAbertas), icon: FileText },
    ] },
  ];
  return FEATURES.telegram ? [...sections, telegramSection(k)] : sections;
}

const PILL = "rounded-full border px-3 py-1";

function HeroPills({ k }: { k: DashboardKpis }) {
  return (
    <div className="mt-5 flex flex-wrap gap-2 text-xs">
      <span className={cn(PILL, "border-white/15 bg-white/5 text-white/85")}>
        {k.tarefasHoje} {k.tarefasHoje === 1 ? "tarefa" : "tarefas"} para hoje
      </span>
      <span className={cn(PILL, "border-white/15 bg-white/5 text-white/85")}>
        {brl(k.entradasMes)} de entradas no mês
      </span>
      {k.tarefasAtrasadas > 0 && (
        <span className={cn(PILL, "border-red-300/30 bg-red-400/10 text-red-100")}>
          {k.tarefasAtrasadas} atrasada{k.tarefasAtrasadas > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

function Hero({ firstName, businessName, k }: { firstName: string; businessName?: string; k?: DashboardKpis }) {
  return (
    <section className="brand-hero overflow-hidden rounded-2xl px-6 py-7 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan">
        {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <h1 className="mt-2 font-heading text-2xl font-semibold text-white sm:text-3xl">
        {greeting()}{firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="mt-1 text-sm text-white/70">
        {businessName ? `Mostrando só ${businessName}.` : "Visão consolidada de todos os negócios."}
      </p>
      {k && <HeroPills k={k} />}
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { currentBusiness } = useWorkspace();
  const { data, isLoading, error } = useDashboardKpis();
  const firstName = ((user?.user_metadata?.full_name as string | undefined) ?? "").split(" ")[0];

  return (
    <div className="space-y-8">
      <Hero firstName={firstName} businessName={currentBusiness?.name} k={data} />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>Não consegui carregar os números: {(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {buildSections(data ?? ZERO).map((s) => <Section key={s.title} title={s.title} loading={isLoading} kpis={s.kpis} />)}
    </div>
  );
}
