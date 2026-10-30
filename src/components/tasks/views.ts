// Visões da tela Tarefas (inteligentes, listas e fluxos): leitura da URL,
// título, valores padrão de tarefa nova e concluídas da visão.
import { CalendarDays, CheckCircle2, Inbox, Star, Sun, type LucideIcon } from "lucide-react";
import type { SmartView, TaskView } from "@/hooks/useTasks";
import type { Task } from "@/integrations/supabase/types";

export const SMART: { id: SmartView; label: string; icon: LucideIcon }[] = [
  { id: "meu-dia", label: "Meu dia", icon: Sun },
  { id: "importantes", label: "Importantes", icon: Star },
  { id: "planejadas", label: "Planejadas", icon: CalendarDays },
  { id: "todas", label: "Todas", icon: Inbox },
  { id: "concluidas", label: "Concluídas", icon: CheckCircle2 },
];

const HOME: TaskView = { kind: "smart", id: "meu-dia" };

export function parseView(v: string | null): TaskView {
  if (!v) return HOME;
  const [kind, id] = v.split(":");
  if ((kind === "list" || kind === "flow") && id) return { kind, id };
  if (kind === "smart" && SMART.some((s) => s.id === id)) return { kind, id: id as SmartView };
  return HOME;
}

export const viewKey = (v: TaskView) => `${v.kind}:${v.id}`;

/** A visão é a visão inteligente `id`? */
export const isSmart = (v: TaskView, id: SmartView) => v.kind === "smart" && v.id === id;

type Named = { id: string; name: string };

export function viewTitle(view: TaskView, lists: Named[], flows: Named[]): string {
  if (view.kind === "smart") return SMART.find((s) => s.id === view.id)?.label ?? "";
  if (view.kind === "list") return lists.find((l) => l.id === view.id)?.name ?? "Lista";
  return flows.find((f) => f.id === view.id)?.name ?? "Fluxo";
}

const SMART_DEFAULTS: Record<SmartView, (today: string) => Partial<Task>> = {
  "meu-dia": (today) => ({ my_day_date: today }),
  importantes: () => ({ is_important: true }),
  planejadas: (today) => ({ due_date: today }),
  todas: () => ({}),
  concluidas: () => ({}),
};

/** Campos já preenchidos numa tarefa criada a partir desta visão. */
export function viewDefaults(view: TaskView, today: string): Partial<Task> {
  if (view.kind === "list") return { list_id: view.id };
  if (view.kind === "flow") return { flow_id: view.id };
  return SMART_DEFAULTS[view.id](today);
}

/** Concluídas desta lista/fluxo (as visões inteligentes não mostram essa seção). */
export function doneInView(tasks: Task[], view: TaskView): Task[] {
  if (view.kind === "smart") return [];
  const belongs = (t: Task) => (view.kind === "list" ? t.list_id === view.id : t.flow_id === view.id);
  return tasks.filter((t) => t.status === "concluida" && belongs(t));
}
