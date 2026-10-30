import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  WorkspaceContext, fetchBusinesses, fetchWorkspaces, pickWorkspace, prefs,
  type BusinessFilter, type WorkspaceState,
} from "@/lib/workspace";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [businessFilter, setFilterState] = useState<BusinessFilter>(prefs.readFilter);
  const [wsId, setWsId] = useState<string | null>(prefs.readWorkspace);

  const wsQuery = useQuery({
    queryKey: ["workspace", user?.id],
    enabled: Boolean(user),
    queryFn: fetchWorkspaces,
  });

  const workspaces = useMemo(() => wsQuery.data ?? [], [wsQuery.data]);
  const workspace = pickWorkspace(workspaces, wsId, user?.id);

  const setWorkspaceId = (id: string) => {
    setWsId(id);
    setFilterState("all");
    prefs.saveWorkspace(id);
    qc.invalidateQueries();
  };

  const bizQuery = useQuery({
    queryKey: ["businesses", workspace?.id],
    enabled: Boolean(workspace),
    queryFn: () => fetchBusinesses(workspace?.id),
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
    prefs.saveFilter(id);
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
