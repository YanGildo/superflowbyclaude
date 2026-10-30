import type { MemberRole, Priority, Recurrence, TaskStatus } from "@/integrations/supabase/types";

export const PRIORITY: Record<Priority, { label: string; className: string; dot: string }> = {
  baixa:   { label: "Baixa",   className: "bg-muted text-muted-foreground",          dot: "bg-slate-400" },
  media:   { label: "Média",   className: "bg-info/10 text-info",                     dot: "bg-info" },
  alta:    { label: "Alta",    className: "bg-warning/15 text-warning",               dot: "bg-warning" },
  urgente: { label: "Urgente", className: "bg-destructive/10 text-destructive",       dot: "bg-destructive" },
};
export const PRIORITIES = Object.keys(PRIORITY) as Priority[];

export const TASK_STATUS: Record<TaskStatus, { label: string; className: string }> = {
  pendente:     { label: "Pendente",     className: "bg-muted text-muted-foreground" },
  em_andamento: { label: "Em andamento", className: "bg-primary/10 text-primary" },
  aguardando:   { label: "Aguardando",   className: "bg-warning/15 text-warning" },
  concluida:    { label: "Concluída",    className: "bg-success/10 text-success" },
};
export const TASK_STATUSES = Object.keys(TASK_STATUS) as TaskStatus[];

export const RECURRENCE: Record<Recurrence, string> = {
  none: "Não repete",
  daily: "Todo dia",
  weekdays: "Dias úteis",
  weekly: "Toda semana",
  monthly: "Todo mês",
  yearly: "Todo ano",
};
export const RECURRENCES = Object.keys(RECURRENCE) as Recurrence[];

export const PROJECT_STATUSES = ["planejado", "em andamento", "pausado", "concluído"] as const;
export const PROJECT_STATUS_LABEL: Record<string, string> = {
  planejado: "Planejado",
  "em andamento": "Em andamento",
  pausado: "Pausado",
  "concluído": "Concluído",
};
export const PROJECT_CATEGORIES = ["Interno", "Cliente", "Campanha", "SaaS", "Serviço", "Infoproduto", "Pessoal", "Outro"];

export const GOAL_CATEGORIES = ["Produtividade", "Financeiro", "Vendas", "Marketing", "Clientes", "Pessoal", "Outro"];
export const GOAL_STATUS_LABEL = { ativa: "Ativa", pausada: "Pausada", concluida: "Concluída" } as const;

/** "2026-10-29" -> "29/10" ; inclui o ano se for de outro ano. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y === String(new Date().getFullYear()) ? `${d}/${m}` : `${d}/${m}/${y}`;
}

export const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Dono", admin: "Administrador", member: "Membro", viewer: "Só visualiza",
};
export const ROLE_HELP: Record<Exclude<MemberRole, "owner">, string> = {
  admin: "Vê e edita tudo.",
  member: "Vê e edita tudo.",
  viewer: "Vê tudo, mas não altera nada.",
};
export const INVITE_ROLE_OPTIONS = (["member", "admin", "viewer"] as const).map((r) => ({ value: r, label: ROLE_LABEL[r] }));
