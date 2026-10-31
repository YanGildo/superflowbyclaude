// Pró-labore: padrão salvo no workspace e registro (saída no negócio + entrada no pessoal).
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useScope } from "@/hooks/useScope";
import { brl } from "@/lib/format";
import { PRO_LABORE_IN, PRO_LABORE_OUT, proLaboreRows, readProLabore, type ProLaboreInput, type ProLaboreSettings } from "@/lib/finPanel";
import { useWorkspace } from "@/lib/workspace";

/** Id da categoria (cria se ainda não existir). */
async function categoryId(ws: string, name: string, kind: "entrada" | "saida"): Promise<string | null> {
  const found = await supabase.from("fin_categories").select("id").eq("workspace_id", ws).eq("name", name).in("kind", [kind, "ambos"]).limit(1);
  if (found.error) throw found.error;
  if (found.data?.length) return (found.data[0] as { id: string }).id;
  const ins = await supabase.from("fin_categories").insert({ workspace_id: ws, name, kind, essential: false }).select("id").single();
  if (ins.error) throw ins.error;
  return (ins.data as { id: string }).id;
}

export function useProLabore() {
  const { workspace, refresh } = useWorkspace();
  const scope = useScope();
  const qc = useQueryClient();
  const settings = readProLabore(workspace?.settings?.prolabore);

  const saveDefault = async (s: ProLaboreSettings) => {
    const { error } = await supabase.from("workspaces").update({ settings: { ...(workspace?.settings ?? {}), prolabore: s } }).eq("id", scope.wsId);
    if (error) throw error;
    refresh();
  };

  const register = useMutation({
    mutationFn: async ({ input, remember }: { input: ProLaboreInput; remember: boolean }) => {
      const cats = { out: await categoryId(scope.wsId, PRO_LABORE_OUT, "saida"), in: await categoryId(scope.wsId, PRO_LABORE_IN, "entrada") };
      const rows = proLaboreRows(input, cats).map((r) => ({ ...r, workspace_id: scope.wsId }));
      const { error } = await supabase.from("transactions").insert(rows);
      if (error) throw error;
      if (remember) await saveDefault({ ...input });
      return input.amount;
    },
    onSuccess: (v) => {
      toast.success(`Pró-labore de ${brl(v)} registrado (saída no negócio e entrada no pessoal).`);
      qc.invalidateQueries({ queryKey: ["fin"] });
      qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
    },
    onError: (e: Error) => toast.error(`Pró-labore não registrado: ${e.message}`),
  });

  return { settings, register };
}
