// Módulos, níveis de acesso e qual tela pertence a qual módulo.
// A regra de verdade está no banco (RLS); aqui só decide o que mostrar.
import { FEATURES } from "@/lib/features";
import type { MemberRole } from "@/integrations/supabase/types";

export type Level = "none" | "view" | "edit" | "manage";
export type ModuleKey =
  | "tarefas" | "projetos" | "metas" | "funis" | "planos" | "comercial" | "prospeccao" | "scripts"
  | "marketing" | "financeiro" | "central" | "telegram";
export type Permissions = Partial<Record<ModuleKey, Level>>;
export type ResourceType = "tasks" | "projects" | "scripts" | "prospects" | "action_plans";

export const LEVELS: { value: Level; label: string; help: string }[] = [
  { value: "none", label: "Sem acesso", help: "Não vê nada do módulo." },
  { value: "view", label: "Ver", help: "Só olha, não altera." },
  { value: "edit", label: "Editar", help: "Cria, altera e exclui." },
  { value: "manage", label: "Gerenciar", help: "Editar + decide quem acessa cada item." },
];
export const LEVEL_LABEL: Record<Level, string> = Object.fromEntries(LEVELS.map((l) => [l.value, l.label])) as Record<Level, string>;
const RANK: Record<Level, number> = { none: 0, view: 1, edit: 2, manage: 3 };
export const rank = (l: Level | null | undefined) => RANK[l ?? "none"] ?? 0;

const ALL_MODULES: { key: ModuleKey; label: string }[] = [
  { key: "tarefas", label: "Tarefas" },
  { key: "projetos", label: "Projetos" },
  { key: "metas", label: "Metas" },
  { key: "funis", label: "Funis" },
  { key: "planos", label: "Planos de ação" },
  { key: "comercial", label: "Comercial e clientes" },
  { key: "prospeccao", label: "Prospecção" },
  { key: "scripts", label: "Scripts" },
  { key: "marketing", label: "Marketing" },
  { key: "financeiro", label: "Financeiro" },
  { key: "central", label: "Agenda e assistente" },
  { key: "telegram", label: "Vendas Telegram" },
];
export const MODULES = ALL_MODULES.filter((m) => m.key !== "telegram" || FEATURES.telegram);
export const MODULE_LABEL = Object.fromEntries(ALL_MODULES.map((m) => [m.key, m.label])) as Record<ModuleKey, string>;

export const RESOURCE_LABEL: Record<ResourceType, string> = {
  tasks: "Tarefa", projects: "Projeto", scripts: "Script", prospects: "Prospect", action_plans: "Plano",
};
export const RESOURCE_MODULE: Record<ResourceType, ModuleKey> = {
  tasks: "tarefas", projects: "projetos", scripts: "scripts", prospects: "prospeccao", action_plans: "planos",
};

/** Tela → módulo. null = livre para todo membro; "admin" = só dono/admin. */
export function moduleOfPath(path: string): ModuleKey | "admin" | null {
  const rules: [string, ModuleKey | "admin"][] = [
    ["/planos", "planos"], ["/tarefas", "tarefas"], ["/projetos", "projetos"], ["/metas", "metas"], ["/funis", "funis"],
    ["/agencia", "comercial"], ["/comercial", "comercial"], ["/whatsapp", "comercial"], ["/prospeccao", "prospeccao"],
    ["/scripts", "scripts"], ["/marketing", "marketing"], ["/financeiro", "financeiro"], ["/telegram", "telegram"],
    ["/integracoes", "admin"], ["/configuracoes", "admin"],
  ];
  return rules.find(([p]) => path === p || path.startsWith(`${p}/`))?.[1] ?? null;
}

export interface Access {
  role: MemberRole;
  kind: "pessoal" | "equipe";
  permissions: Permissions;
  /** Módulos em que a pessoa tem algum item liberado individualmente. */
  grantedModules: ModuleKey[];
}

/** Nível no módulo (dono/admin = gerenciar). */
export function moduleLevel(a: Access | null, m: ModuleKey): Level {
  if (!a) return "none";
  if (a.role === "owner" || a.role === "admin") return "manage";
  const l = a.permissions[m] ?? "none";
  return a.role === "viewer" && rank(l) > 1 ? "view" : l;
}

/** Pode abrir a tela? (módulo com acesso ou algum item liberado). */
export function canOpenPath(a: Access | null, path: string): boolean {
  const m = moduleOfPath(path);
  if (!a || m === null) return true;
  if (m === "admin") return a.role === "owner" || a.role === "admin";
  return rank(moduleLevel(a, m)) >= 1 || a.grantedModules.includes(m);
}

/** Resumo curto: "Tarefas: Editar · Projetos: Ver". */
export function permissionSummary(p: Permissions | null): string {
  const parts = MODULES.filter((m) => p?.[m.key] && p[m.key] !== "none").map((m) => `${m.label}: ${LEVEL_LABEL[p?.[m.key] ?? "none"]}`);
  return parts.length ? parts.join(" · ") : "Nenhum módulo liberado";
}
