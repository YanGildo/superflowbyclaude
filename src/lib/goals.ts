import type { Goal, GoalStep } from "@/integrations/supabase/types";

/** Valor-alvo financeiro? Mostra em R$; senão em número simples. */
export const isMoney = (g: Goal) => g.category === "Financeiro" || g.category === "Vendas";

export function goalProgress(g: Goal, steps: GoalStep[]) {
  if (g.status === "concluida") return 100;
  if (g.target_value && g.target_value > 0) return Math.min(100, Math.round((g.current_value / g.target_value) * 100));
  if (!steps.length) return 0;
  return Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
}

/** "R$ 1.000 de R$ 5.000", "2/5 etapas" ou "Adicione etapas". */
export function goalProgressText(g: Goal, steps: GoalStep[], money: (v: number) => string): string {
  if (g.target_value) {
    const fmt = (v: number) => (isMoney(g) ? money(v) : String(v));
    return `${fmt(g.current_value)} de ${fmt(g.target_value)}`;
  }
  if (steps.length) return `${steps.filter((s) => s.done).length}/${steps.length} etapas`;
  return "Adicione etapas";
}
