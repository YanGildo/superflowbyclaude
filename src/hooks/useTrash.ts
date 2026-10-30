// Lixeira: itens com deleted_at em todas as tabelas que têm lixeira.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Tabelas que têm lixeira (deleted_at) e a coluna usada como nome. */
const SOURCES = [
  { table: "tasks", label: "Tarefa", name: "title" },
  { table: "task_lists", label: "Lista", name: "name" },
  { table: "projects", label: "Projeto", name: "name" },
  { table: "goals", label: "Meta", name: "title" },
  { table: "funnels", label: "Funil", name: "name" },
  { table: "contacts", label: "Contato", name: "name" },
  { table: "proposals", label: "Proposta", name: "title" },
  { table: "transactions", label: "Lançamento", name: "description" },
] as const;

export interface TrashItem { table: string; label: string; id: string; name: string; deleted_at: string }

export function useTrash(wsId: string, ready: boolean) {
  const qc = useQueryClient();

  const items = useQuery({
    queryKey: ["trash", wsId],
    enabled: ready,
    queryFn: async () => {
      const results = await Promise.all(SOURCES.map(async (s) => {
        const { data: rows, error } = await supabase.from(s.table)
          .select(`id, ${s.name}, deleted_at`).eq("workspace_id", wsId).not("deleted_at", "is", null);
        if (error) throw error;
        return ((rows ?? []) as unknown as Record<string, string>[]).map((r) => ({
          table: s.table, label: s.label, id: r.id, name: r[s.name] ?? "(sem nome)", deleted_at: r.deleted_at,
        }));
      }));
      return results.flat().sort((a, b) => b.deleted_at.localeCompare(a.deleted_at)) as TrashItem[];
    },
  });

  const invalidate = () => qc.invalidateQueries();

  const restore = useMutation({
    mutationFn: async (i: TrashItem) => {
      const { error } = await supabase.from(i.table).update({ deleted_at: null }).eq("id", i.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Restaurado."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const destroy = useMutation({
    mutationFn: async (list: TrashItem[]) => {
      for (const i of list) {
        const { error } = await supabase.from(i.table).delete().eq("id", i.id);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast("Excluído de vez."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { items, restore, destroy };
}
