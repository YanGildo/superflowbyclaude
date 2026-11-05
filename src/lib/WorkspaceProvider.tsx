import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  WorkspaceContext, accessHelpers, fetchAccess, fetchBusinesses, fetchWorkspaces, pickWorkspace, prefs,
  type BusinessFilter, type WorkspaceState,
} from "@/lib/workspace";

function useAccessQuery(wsId: string | undefined, userId: string | undefined) {
  return useQuery({ queryKey: ["my-access", wsId, userId], enabled: Boolean(wsId), queryFn: () => fetchAccess(wsId) });
}

const firstError = (...errs: (Error | null)[]) => errs.find(Boolean)?.message ?? null;
const isLoading = (ws: boolean, hasWs: boolean, rest: boolean) => ws || (hasWs && rest);

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

  const accessQuery = useAccessQuery(workspace?.id, user?.id);
  const access = accessQuery.data || null;

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

  const error = firstError(wsQuery.error, bizQuery.error, accessQuery.error);
  const loading = isLoading(wsQuery.isLoading, Boolean(workspace), bizQuery.isLoading || accessQuery.isLoading);

  const value: WorkspaceState = {
    workspace,
    workspaces,
    setWorkspaceId,
    isOwner: Boolean(workspace && user && workspace.owner_id === user.id),
    access,
    ...accessHelpers(access),
    businesses,
    loading,
    error,
    businessFilter,
    setBusinessFilter,
    currentBusiness: businesses.find((b) => b.id === businessFilter) ?? null,
    refresh: () => {
      qc.invalidateQueries({ queryKey: ["workspace"] });
      qc.invalidateQueries({ queryKey: ["businesses"] });
      qc.invalidateQueries({ queryKey: ["my-access"] });
    },
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
