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
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import { brl, greeting } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Kpi {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "good" | "bad";
  hint?: string;
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-3 p-4">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg",
          kpi.tone === "bad" ? "bg-destructive/10 text-destructive"
          : kpi.tone === "good" ? "bg-success/10 text-success"
          : "bg-primary/10 text-primary")}>
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

export default function Dashboard() {
  const { user } = useAuth();
  const { currentBusiness } = useWorkspace();
  const { data, isLoading, error } = useDashboardKpis();
  const k = data;
  const firstName = ((user?.user_metadata?.full_name as string | undefined) ?? "").split(" ")[0];
  const n = (v: number | undefined) => String(v ?? 0);
  const saldo = (k?.entradasMes ?? 0) - (k?.saidasMes ?? 0);

  return (
    <div className="space-y-8">
      <section className="brand-hero overflow-hidden rounded-2xl px-6 py-7 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="mt-2 font-heading text-2xl font-semibold text-white sm:text-3xl">
          {greeting()}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-white/70">
          {currentBusiness ? `Mostrando só ${currentBusiness.name}.` : "Visão consolidada de todos os negócios."}
        </p>
        {k && (
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/85">
              {k.tarefasHoje} {k.tarefasHoje === 1 ? "tarefa" : "tarefas"} para hoje
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/85">
              {brl(k.entradasMes)} de entradas no mês
            </span>
            {k.tarefasAtrasadas > 0 && (
              <span className="rounded-full border border-red-300/30 bg-red-400/10 px-3 py-1 text-red-100">
                {k.tarefasAtrasadas} atrasada{k.tarefasAtrasadas > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>Não consegui carregar os números: {(error as Error).message}</AlertDescription>
        </Alert>
      )}

      <Section title="Hoje" loading={isLoading} kpis={[
        { label: "Tarefas de hoje", value: n(k?.tarefasHoje), icon: ListTodo },
        { label: "Tarefas atrasadas", value: n(k?.tarefasAtrasadas), icon: AlarmClock, tone: k?.tarefasAtrasadas ? "bad" : "default" },
        { label: "Contas vencendo (7 dias)", value: n(k?.contasVencendo), icon: Receipt, tone: k?.contasVencendo ? "bad" : "default" },
        { label: "Entregas atrasadas", value: n(k?.entregasAtrasadas), icon: PackageX, tone: k?.entregasAtrasadas ? "bad" : "default" },
      ]} />

      <Section title="Financeiro do mês" loading={isLoading} kpis={[
        { label: "Entradas", value: brl(k?.entradasMes ?? 0), icon: TrendingUp, tone: "good" },
        { label: "Saídas", value: brl(k?.saidasMes ?? 0), icon: TrendingDown },
        { label: "Saldo", value: brl(saldo), icon: DollarSign, tone: saldo < 0 ? "bad" : "good" },
        { label: "Receita recorrente", value: brl(k?.receitaRecorrente ?? 0), icon: Repeat, hint: "Mensalidades de clientes ativos" },
      ]} />

      <Section title="Comercial" loading={isLoading} kpis={[
        { label: "Clientes ativos", value: n(k?.clientesAtivos), icon: Users },
        { label: "Propostas em aberto", value: n(k?.propostasAbertas), icon: FileText },
      ]} />

      <Section title="Vendas Telegram · hoje" loading={isLoading} kpis={[
        { label: "Starts", value: n(k?.tgStartsHoje), icon: Zap },
        { label: "Vendas aprovadas", value: n(k?.tgVendasHoje), icon: ShoppingCart },
        { label: "Faturamento", value: brl(k?.tgFaturamentoHoje ?? 0), icon: DollarSign, tone: "good" },
        {
          label: "Ticket médio",
          value: brl(k && k.tgVendasHoje > 0 ? k.tgFaturamentoHoje / k.tgVendasHoje : 0),
          icon: TrendingUp,
        },
      ]} />
    </div>
  );
}
