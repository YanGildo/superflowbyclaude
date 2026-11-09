// Formulários do site: lista, criação, edição e respostas (tabelas site_forms e site_form_responses).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useScope } from "@/hooks/useScope";
import { cleanContent, type FormContent, type FormResponse, type SiteForm } from "@/lib/siteForms";

export function useSiteForms() {
  const scope = useScope();
  return useQuery({
    queryKey: ["site-forms", scope.wsId],
    enabled: scope.ready,
    queryFn: async () => {
      const { data, error } = await supabase.from("site_forms").select("*").eq("workspace_id", scope.wsId).order("created_at");
      if (error) throw error;
      return (data ?? []) as SiteForm[];
    },
  });
}

export function useFormResponses(formId: string | null) {
  return useQuery({
    queryKey: ["site-form-responses", formId],
    enabled: Boolean(formId),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("site_form_responses").select("*").eq("form_id", formId).order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as FormResponse[];
    },
  });
}

/** Quantas pessoas começaram e quantas terminaram cada formulário. */
export function useResponseCounts() {
  const scope = useScope();
  return useQuery({
    queryKey: ["site-form-counts", scope.wsId],
    enabled: scope.ready,
    queryFn: async () => {
      const { data, error } = await supabase.from("site_form_responses").select("form_id, done").eq("workspace_id", scope.wsId).limit(20000);
      if (error) throw error;
      const out: Record<string, { total: number; done: number }> = {};
      for (const r of (data ?? []) as { form_id: string; done: boolean }[]) {
        const c = (out[r.form_id] ??= { total: 0, done: 0 });
        c.total++; if (r.done) c.done++;
      }
      return out;
    },
  });
}

export function useSiteFormActions() {
  const qc = useQueryClient();
  const scope = useScope();
  const refresh = () => { qc.invalidateQueries({ queryKey: ["site-forms"] }); qc.invalidateQueries({ queryKey: ["site-form-counts"] }); };
  const onError = (e: Error) => toast.error(e.message.includes("duplicate") ? "Já existe um formulário com esse endereço." : `Não salvou: ${e.message}`);

  const create = useMutation({
    mutationFn: async (f: { slug: string; name: string; content: FormContent; pipelineId: string | null; stageId: string | null; source: string }) => {
      const { data, error } = await supabase.from("site_forms").insert({
        workspace_id: scope.wsId, business_id: scope.businessIdForNew, slug: f.slug, name: f.name.trim(), content: cleanContent(f.content),
        pipeline_id: f.pipelineId, stage_id: f.stageId, source: f.source,
      }).select("*").single();
      if (error) throw error;
      return data as SiteForm;
    },
    onSuccess: () => { refresh(); toast.success("Formulário criado."); },
    onError,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<SiteForm, "name" | "active" | "pipeline_id" | "stage_id" | "source" | "content">> }) => {
      const body = patch.content ? { ...patch, content: cleanContent(patch.content) } : patch;
      const { error } = await supabase.from("site_forms").update(body).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast.success("Salvo. A página do site já usa a versão nova."); },
    onError,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("site_forms").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { refresh(); toast.success("Formulário apagado."); },
    onError,
  });

  return { create, update, remove };
}
