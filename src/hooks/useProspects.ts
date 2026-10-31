// Prospecção: lista, buscas na Apify (via Edge Function), importação, score e conversão em lead.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Prospect, ProspectCampaign, ProspectSearch } from "@/integrations/supabase/types";
import { useScope } from "@/hooks/useScope";
import { useWorkspace } from "@/lib/workspace";
import { readSettings, scoreProspect, type ProspectSettings } from "@/lib/prospecting";

const KEY = "prospect";

function useList<T>(table: string, order: string) {
  const scope = useScope();
  return useQuery({
    queryKey: [KEY, table, scope.wsId],
    enabled: scope.ready,
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").eq("workspace_id", scope.wsId).order(order, { ascending: false }).limit(5000);
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export const useProspects = () => useList<Prospect>("prospects", "created_at");
export const useProspectSearches = () => useList<ProspectSearch>("prospect_searches", "created_at");
export const useProspectCampaigns = () => useList<ProspectCampaign>("prospect_campaigns", "created_at");

/** Configurações da prospecção (ficam em workspaces.settings.prospeccao). */
export function useProspectSettings() {
  const { workspace, refresh } = useWorkspace();
  const settings = readSettings(workspace?.settings?.prospeccao);
  const save = useMutation({
    mutationFn: async (s: ProspectSettings) => {
      const { error } = await supabase.from("workspaces").update({ settings: { ...(workspace?.settings ?? {}), prospeccao: s } }).eq("id", workspace?.id ?? "");
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast.success("Configurações salvas."); },
    onError: (e: Error) => toast.error(e.message),
  });
  return { settings, save };
}

type ApifyResult = { ok: boolean; error?: string; [k: string]: unknown };

async function callApify(body: Record<string, unknown>): Promise<ApifyResult> {
  const { data, error } = await supabase.functions.invoke("apify-prospect", { body });
  if (error) return { ok: false, error: `Não consegui falar com a função de prospecção no servidor (${error.message}).` };
  return data as ApifyResult;
}

export function useProspectActions() {
  const qc = useQueryClient();
  const scope = useScope();
  const { settings } = useProspectSettings();
  const refresh = () => qc.invalidateQueries({ queryKey: [KEY] });
  const fail = (e: Error) => toast.error(e.message);

  /** Calcula o score de quem ainda não tem (ou de todos, se pedido). */
  const rescore = async (list: Prospect[], all = false) => {
    const todo = list.filter((p) => all || p.score == null);
    await Promise.all(todo.map((p) => {
      const r = scoreProspect(p, settings);
      return supabase.from("prospects").update({ score: r.score, score_reasons: r.reasons }).eq("id", p.id);
    }));
    if (todo.length) refresh();
    return todo.length;
  };

  const test = useMutation({ mutationFn: () => callApify({ action: "test" }) });

  const start = useMutation({
    mutationFn: async (filters: Record<string, unknown>) => {
      const r = await callApify({ action: "start", workspaceId: scope.wsId, filters });
      if (!r.ok) throw new Error(r.error ?? "Não consegui iniciar a busca.");
      return r;
    },
    onSuccess: () => { refresh(); toast.success("Busca iniciada na Apify. Clique em Atualizar em alguns minutos."); },
    onError: fail,
  });

  const sync = useMutation({
    mutationFn: async (searchId: string) => {
      const r = await callApify({ action: "sync", searchId });
      if (!r.ok) throw new Error(r.error ?? "Não consegui atualizar.");
      return r;
    },
    onSuccess: (r) => {
      refresh();
      toast(r.status === "done" ? `Pronto: ${r.total} encontrados, ${r.novos} novos.` : r.status === "running" ? "Ainda rodando na Apify." : "A busca falhou na Apify.");
    },
    onError: fail,
  });

  const importRows = useMutation({
    mutationFn: async (rows: Partial<Prospect>[]) => {
      const { error } = await supabase.from("prospects")
        .upsert(rows.map((r) => ({ ...r, workspace_id: scope.wsId })), { onConflict: "workspace_id,place_id", ignoreDuplicates: true });
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => { refresh(); toast.success(`${n} prospect(s) importado(s).`); },
    onError: fail,
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Prospect> }) => {
      const { error } = await supabase.from("prospects").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prospects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: fail,
  });

  const saveCampaign = useMutation({
    mutationFn: async (c: Partial<ProspectCampaign>) => {
      const { id, ...rest } = c;
      const q = id ? supabase.from("prospect_campaigns").update(rest).eq("id", id) : supabase.from("prospect_campaigns").insert({ ...rest, workspace_id: scope.wsId });
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: fail,
  });

  return { rescore, test, start, sync, importRows, patch, remove, saveCampaign };
}
