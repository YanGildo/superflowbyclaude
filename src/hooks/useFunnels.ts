import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Funnel } from "@/integrations/supabase/types";
import { useScope } from "@/hooks/useScope";

export function useFunnels() {
  const scope = useScope();
  return useQuery({
    queryKey: ["funnels", scope.wsId, scope.businessFilter],
    enabled: scope.ready,
    queryFn: async () => {
      const { data, error } = await scope.apply(supabase.from("funnels").select("id, workspace_id, business_id, name, nodes, edges, deleted_at, created_at, updated_at"))
        .is("deleted_at", null).order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Funnel[];
    },
  });
}

export function useFunnel(id: string | null) {
  return useQuery({
    queryKey: ["funnel", id],
    enabled: Boolean(id),
    staleTime: Infinity, // o editor é a fonte da verdade enquanto está aberto
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("funnels").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Funnel | null;
    },
  });
}

export function useFunnelMutations() {
  const qc = useQueryClient();
  const scope = useScope();

  const create = useMutation({
    mutationFn: async ({ name, nodes, edges }: { name: string; nodes: unknown[]; edges: unknown[] }) => {
      const { data, error } = await supabase.from("funnels")
        .insert({ workspace_id: scope.wsId, business_id: scope.businessIdForNew, name: name.trim(), nodes, edges })
        .select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["funnels"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Funnel, "name" | "nodes" | "edges">> }) => {
      const { error } = await supabase.from("funnels").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["funnels"] }),
    onError: (e: Error) => toast.error(`Não salvou o funil: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("funnels").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["funnels"] }); toast("Funil movido para a lixeira."); },
  });

  return { create, save, remove };
}
