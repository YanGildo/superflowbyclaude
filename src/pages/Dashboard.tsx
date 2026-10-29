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
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
          <p className={cn("mt-2 text-2xl font-semibold tabular-nums",
            kpi.tone === "good" && "text-success", kpi.tone === "bad" && "text-destructive")}>
            {kpi.value}
          </p>
          {kpi.hint && <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>}
        </div>
        <kpi.icon className="size-4 shrink-0 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function Section({ title, kpis, loading }: { title: string; kpis: Kpi[]; loading: boolean }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? kpis.map((k) => <Skeleton key={k.label} className="h-[104px] rounded-xl" />)
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
      <div>
        <h1 className="text-2xl font-semibold">{greeting()}{firstName ? `, ${firstName}` : ""}</h1>
        <p className="text-sm text-muted-foreground">
          {currentBusiness ? `Mostrando só ${currentBusiness.name}.` : "Visão consolidada de todos os negócios."}
        </p>
      </div>

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
