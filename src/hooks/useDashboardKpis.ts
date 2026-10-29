import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { localISODate, monthRange } from "@/lib/format";

export interface DashboardKpis {
  tarefasHoje: number;
  tarefasAtrasadas: number;
  entradasMes: number;
  saidasMes: number;
  clientesAtivos: number;
  receitaRecorrente: number;
  propostasAbertas: number;
  entregasAtrasadas: number;
  contasVencendo: number;
  tgStartsHoje: number;
  tgVendasHoje: number;
  tgFaturamentoHoje: number;
}

/** Conta linhas com filtros. `head: true` não traz os dados, só a contagem. */
async function count(
  table: string,
  build: (q: any) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<number> {
  const { count: n, error } = await build(supabase.from(table).select("id", { count: "exact", head: true }));
  if (error) throw error;
  return n ?? 0;
}

async function sum(
  table: string,
  column: string,
  build: (q: any) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<number> {
  const { data, error } = await build(supabase.from(table).select(column));
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).reduce((acc, r) => acc + Number(r[column] ?? 0), 0);
}

export function useDashboardKpis() {
  const { workspace, businessFilter } = useWorkspace();
  const ws = workspace?.id;

  return useQuery({
    queryKey: ["dashboard-kpis", ws, businessFilter],
    enabled: Boolean(ws),
    queryFn: async (): Promise<DashboardKpis> => {
      const today = localISODate();
      const { start, next } = monthRange();
      const in7 = localISODate(new Date(Date.now() + 7 * 864e5));
      const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

      // Aplica workspace + filtro de negócio nas tabelas que têm business_id.
      const scoped = (q: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        let r = q.eq("workspace_id", ws);
        if (businessFilter !== "all") r = r.eq("business_id", businessFilter);
        return r;
      };
      const wsOnly = (q: any) => q.eq("workspace_id", ws); // eslint-disable-line @typescript-eslint/no-explicit-any

      const [
        tarefasHoje, tarefasAtrasadas, entradasMes, saidasMes, clientesAtivos, receitaRecorrente,
        propostasAbertas, entregasAtrasadas, contasVencendo, tgStartsHoje, tgVendasHoje, tgFaturamentoHoje,
      ] = await Promise.all([
        count("tasks", (q) => scoped(q).is("deleted_at", null).neq("status", "concluida")
          .or(`my_day_date.eq.${today},due_date.eq.${today}`)),
        count("tasks", (q) => scoped(q).is("deleted_at", null).neq("status", "concluida").lt("due_date", today)),
        sum("transactions", "amount", (q) => scoped(q).is("deleted_at", null).eq("type", "entrada").eq("status", "pago")
          .gte("date", start).lt("date", next)),
        sum("transactions", "amount", (q) => scoped(q).is("deleted_at", null).eq("type", "saida").eq("status", "pago")
          .gte("date", start).lt("date", next)),
        count("contacts", (q) => scoped(q).is("deleted_at", null).eq("status", "cliente_ativo")),
        sum("contacts", "monthly_value", (q) => scoped(q).is("deleted_at", null).eq("status", "cliente_ativo")),
        count("proposals", (q) => scoped(q).is("deleted_at", null).in("status", ["enviada", "em_negociacao"])),
        count("deliveries", (q) => wsOnly(q).is("deleted_at", null).lt("due_date", today)
          .not("status", "in", "(aprovado,publicado)")),
        count("payables", (q) => scoped(q).in("status", ["pendente", "atrasado"]).lte("due_date", in7)),
        count("bot_events", (q) => wsOnly(q).eq("type", "start").gte("at", startOfDay)),
        count("payments", (q) => wsOnly(q).eq("status", "pago").gte("paid_at", startOfDay)),
        sum("payments", "amount", (q) => wsOnly(q).eq("status", "pago").gte("paid_at", startOfDay)),
      ]);

      return {
        tarefasHoje, tarefasAtrasadas, entradasMes, saidasMes, clientesAtivos, receitaRecorrente,
        propostasAbertas, entregasAtrasadas, contasVencendo, tgStartsHoje, tgVendasHoje, tgFaturamentoHoje,
      };
    },
  });
}
