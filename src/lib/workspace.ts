import { createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Business, Workspace } from "@/integrations/supabase/types";
import { canOpenPath, moduleLevel, rank, type Access, type Level, type ModuleKey } from "@/lib/access";

/** "all" = visão consolidada de todos os negócios. */
export type BusinessFilter = "all" | string;

export interface WorkspaceState {
  workspace: Workspace | null;
  workspaces: Workspace[];
  setWorkspaceId: (id: string) => void;
  isOwner: boolean;
  /** Papel e permissões da pessoa no espaço atual. */
  access: Access | null;
  /** Dono ou admin do espaço atual. */
  isManager: boolean;
  isTeam: boolean;
  can: (m: ModuleKey, l?: Level) => boolean;
  canOpen: (path: string) => boolean;
  businesses: Business[];
  loading: boolean;
  error: string | null;
  businessFilter: BusinessFilter;
  setBusinessFilter: (id: BusinessFilter) => void;
  currentBusiness: Business | null;
  refresh: () => void;
}

export const WorkspaceContext = createContext<WorkspaceState | null>(null);
const FILTER_KEY = "superflow:business-filter";
const WS_KEY = "superflow:workspace";

/** Preferências lembradas no navegador (sem storage: só não lembra). */
export const prefs = {
  readFilter(): BusinessFilter {
    try {
      return localStorage.getItem(FILTER_KEY) || "all";
    } catch {
      return "all";
    }
  },
  readWorkspace(): string | null {
    try { return localStorage.getItem(WS_KEY); } catch { return null; }
  },
  saveFilter(id: BusinessFilter) {
    try { localStorage.setItem(FILTER_KEY, id); } catch { /* sem storage */ }
  },
  saveWorkspace(id: string) {
    try { localStorage.setItem(WS_KEY, id); localStorage.setItem(FILTER_KEY, "all"); } catch { /* sem storage */ }
  },
};

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, owner_id, settings, kind")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as Workspace[];
}

export async function fetchBusinesses(workspaceId: string | undefined): Promise<Business[]> {
  if (!workspaceId) return [];
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("position")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Business[];
}

/** Escolhido > o seu espaço pessoal > o primeiro. */
export function pickWorkspace(list: Workspace[], chosenId: string | null, userId: string | undefined): Workspace | null {
  return list.find((w) => w.id === chosenId)
    ?? list.find((w) => w.owner_id === userId && w.kind !== "equipe")
    ?? list.find((w) => w.owner_id === userId) ?? list[0] ?? null;
}

interface AccessRow { role: Access["role"]; kind: Access["kind"]; permissions: Access["permissions"] | null; granted_modules: ModuleKey[] | null }

export async function fetchAccess(workspaceId: string | undefined): Promise<Access | null> {
  if (!workspaceId) return null;
  const { data, error } = await supabase.rpc("my_access", { _ws: workspaceId });
  if (error) throw error;
  const row = (data as AccessRow[] | null)?.[0];
  if (!row) return null;
  return { role: row.role, kind: row.kind, permissions: row.permissions ?? {}, grantedModules: row.granted_modules ?? [] };
}

/** Funções de permissão a partir do acesso carregado. */
export function accessHelpers(access: Access | null) {
  return {
    isManager: access?.role === "owner" || access?.role === "admin",
    isTeam: access?.kind === "equipe",
    can: (m: ModuleKey, l: Level = "view") => rank(moduleLevel(access, m)) >= rank(l),
    canOpen: (path: string) => canOpenPath(access, path),
  };
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace precisa estar dentro de <WorkspaceProvider>");
  return ctx;
}
