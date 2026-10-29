import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Business, Workspace } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";

/** "all" = visão consolidada de todos os negócios. */
export type BusinessFilter = "all" | string;

interface WorkspaceState {
  workspace: Workspace | null;
  workspaces: Workspace[];
  setWorkspaceId: (id: string) => void;
  isOwner: boolean;
  businesses: Business[];
  loading: boolean;
  error: string | null;
  businessFilter: BusinessFilter;
  setBusinessFilter: (id: BusinessFilter) => void;
  currentBusiness: Business | null;
  refresh: () => void;
}

const WorkspaceContext = createContext<WorkspaceState | null>(null);
const FILTER_KEY = "superflow:business-filter";
const WS_KEY = "superflow:workspace";

function readFilter(): BusinessFilter {
  try {
    return localStorage.getItem(FILTER_KEY) || "all";
  } catch {
    return "all";
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [businessFilter, setFilterState] = useState<BusinessFilter>(readFilter);
  const [wsId, setWsId] = useState<string | null>(() => {
    try { return localStorage.getItem(WS_KEY); } catch { return null; }
  });

  const wsQuery = useQuery({
    queryKey: ["workspace", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name, owner_id, settings")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Workspace[];
    },
  });

  const workspaces = useMemo(() => wsQuery.data ?? [], [wsQuery.data]);
  // escolhido > o seu próprio > o primeiro
  const workspace =
    workspaces.find((w) => w.id === wsId) ??
    workspaces.find((w) => w.owner_id === user?.id) ??
    workspaces[0] ?? null;

  const setWorkspaceId = (id: string) => {
    setWsId(id);
    setFilterState("all");
    try { localStorage.setItem(WS_KEY, id); localStorage.setItem(FILTER_KEY, "all"); } catch { /* sem storage */ }
    qc.invalidateQueries();
  };

  const bizQuery = useQuery({
    queryKey: ["businesses", workspace?.id],
    enabled: Boolean(workspace),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("workspace_id", workspace!.id)
        .is("archived_at", null)
        .order("position")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Business[];
    },
  });

  const businesses = useMemo(() => bizQuery.data ?? [], [bizQuery.data]);

  // Se o negócio salvo foi arquivado/excluído, volta para "Todos".
  useEffect(() => {
    if (businessFilter !== "all" && bizQuery.isSuccess && !businesses.some((b) => b.id === businessFilter)) {
      setFilterState("all");
    }
  }, [businessFilter, businesses, bizQuery.isSuccess]);

  const setBusinessFilter = (id: BusinessFilter) => {
    setFilterState(id);
    try {
      localStorage.setItem(FILTER_KEY, id);
    } catch {
      /* navegador sem storage: só não lembra a escolha */
    }
  };

  const error = (wsQuery.error ?? bizQuery.error) as Error | null;

  const value: WorkspaceState = {
    workspace,
    workspaces,
    setWorkspaceId,
    isOwner: Boolean(workspace && user && workspace.owner_id === user.id),
    businesses,
    loading: wsQuery.isLoading || (Boolean(workspace) && bizQuery.isLoading),
    error: error ? error.message : null,
    businessFilter,
    setBusinessFilter,
    currentBusiness: businesses.find((b) => b.id === businessFilter) ?? null,
    refresh: () => {
      qc.invalidateQueries({ queryKey: ["workspace"] });
      qc.invalidateQueries({ queryKey: ["businesses"] });
    },
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace precisa estar dentro de <WorkspaceProvider>");
  return ctx;
}
