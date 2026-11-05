// Planos de ação (sem React): progresso, próximo passo, fases e os números da semana.
import type { ActionAssetKind, ActionPlanStep } from "@/integrations/supabase/types";
import { localISODate } from "@/lib/format";

/** Só etapas marcáveis contam no progresso (rotinas que se repetem não). */
export const checkable = (steps: ActionPlanStep[]) => steps.filter((s) => !s.repeat);

export function planProgress(steps: ActionPlanStep[]) {
  const list = checkable(steps);
  const done = list.filter((s) => s.done_at).length;
  return { done, total: list.length, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
}

const byOrder = (a: ActionPlanStep, b: ActionPlanStep) => a.position - b.position || a.created_at.localeCompare(b.created_at);

/** Primeira etapa ainda não feita, na ordem do plano. */
export const nextStep = (steps: ActionPlanStep[]) => checkable(steps).sort(byOrder).find((s) => !s.done_at) ?? null;

/** Etapas agrupadas por fase, na ordem em que as fases aparecem. */
export function phasesOf(steps: ActionPlanStep[]) {
  const map = new Map<string, ActionPlanStep[]>();
  [...steps].sort(byOrder).forEach((s) => map.set(s.phase, [...(map.get(s.phase) ?? []), s]));
  return [...map.entries()].map(([phase, list]) => {
    const p = planProgress(list);
    return { phase, steps: list, ...p, routine: list.every((s) => s.repeat) };
  });
}

export const ASSET_KIND: Record<ActionAssetKind, { label: string; tone: string }> = {
  script: { label: "Script", tone: "bg-primary/10 text-primary" },
  prompt: { label: "Prompt", tone: "bg-info/10 text-info" },
  nota: { label: "Nota", tone: "bg-muted text-muted-foreground" },
  link: { label: "Link", tone: "bg-success/10 text-success" },
};

/** Números acompanhados toda sexta. */
export const METRICS: { key: string; label: string; money?: boolean }[] = [
  { key: "contatos", label: "Contatos enviados" },
  { key: "respostas", label: "Respostas" },
  { key: "demos", label: "Demos enviados" },
  { key: "propostas", label: "Propostas" },
  { key: "vendas", label: "Vendas" },
  { key: "faturamento", label: "Faturamento (€)", money: true },
  { key: "custo_conversa", label: "Custo por conversa (€)", money: true },
];

/** Segunda-feira da semana de uma data (yyyy-mm-dd). */
export function weekStart(date = localISODate()): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localISODate(d);
}

/** Taxa de resposta e de fechamento da semana (em %), quando dá para calcular. */
export function weekRates(v: Record<string, number | null>) {
  const pct = (a?: number | null, b?: number | null) => (a != null && b ? Math.round((a / b) * 100) : null);
  return { resposta: pct(v.respostas, v.contatos), fechamento: pct(v.vendas, v.respostas) };
}
