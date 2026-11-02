// Integrações: o que já foi feito da lista de pendências (fica em workspaces.settings.integracoes).
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProspectSettings } from "@/hooks/useProspects";
import { INTEGRATIONS, PENDING, type Integration, type PendingItem } from "@/lib/integrations";
import { useWorkspace } from "@/lib/workspace";

export function useIntegrations() {
  const { workspace, refresh } = useWorkspace();
  const { settings: prospect } = useProspectSettings();
  const saved = (workspace?.settings?.integracoes as { feitos?: string[] } | undefined)?.feitos ?? [];
  const motorOk = prospect.provider === "motor" && Boolean(prospect.engineUrl && prospect.engineKey);

  const isDone = (p: PendingItem) => (p.auto === "motor" ? motorOk : saved.includes(p.id));

  const toggle = useMutation({
    mutationFn: async (id: string) => {
      const feitos = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
      const { error } = await supabase.from("workspaces").update({ settings: { ...(workspace?.settings ?? {}), integracoes: { feitos } } }).eq("id", workspace?.id ?? "");
      if (error) throw error;
    },
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const integrations: Integration[] = INTEGRATIONS.map((i) => (i.id === "motor" && motorOk ? { ...i, status: "ativo" } : i));
  const required = PENDING.filter((p) => !p.optional);
  return { pending: PENDING, integrations, isDone, toggle, doneCount: required.filter(isDone).length, requiredCount: required.length };
}
