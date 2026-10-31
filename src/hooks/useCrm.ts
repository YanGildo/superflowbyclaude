// Comercial: contatos, pipeline, oportunidades, propostas, atividades, jornada, scripts e conversas.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type {
  Activity, ChatMessage, ChatThread, Contact, Deal, JourneyItem, Pipeline, PipelineStage, Proposal, ProposalItem,
  Script, ScriptSegment, Service,
} from "@/integrations/supabase/types";
import { useScope } from "@/hooks/useScope";

/** Tabelas do comercial e se o filtro de negócio se aplica a elas. */
const HAS_BUSINESS: Record<string, boolean> = {
  contacts: true, pipelines: false, pipeline_stages: false, deals: true, activities: true, services: false,
  proposals: true, proposal_items: false, journey_items: true, scripts: false, script_segments: false,
  chat_threads: true, chat_messages: false, campaigns: true,
  content_items: true, deliveries: true, marketing_plans: true,
};

/** Tabelas com lixeira (deleted_at) em vez de exclusão definitiva. */
const SOFT_DELETE = new Set(["contacts", "deals", "proposals", "campaigns", "content_items", "deliveries"]);

export type CrmTable = keyof typeof HAS_BUSINESS;

type Builder = (q: any) => any; // eslint-disable-line @typescript-eslint/no-explicit-any

export function useCrmList<T>(table: CrmTable, extraKey: unknown[], build: Builder, enabled = true) {
  const scope = useScope();
  return useQuery({
    queryKey: ["crm", table, scope.wsId, scope.businessFilter, ...extraKey],
    enabled: scope.ready && enabled,
    queryFn: async () => {
      const { data, error } = await build(scope.apply(supabase.from(table).select("*"), { business: HAS_BUSINESS[table] }));
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

/* ------------------------------ Consultas ------------------------------ */

export const useContacts = () =>
  useCrmList<Contact>("contacts", [], (q) => q.is("deleted_at", null).order("created_at", { ascending: false }).limit(5000));

export const usePipelines = () => useCrmList<Pipeline>("pipelines", [], (q) => q.order("position").order("created_at"));

export const useStages = () => useCrmList<PipelineStage>("pipeline_stages", [], (q) => q.order("position"));

export const useDeals = () =>
  useCrmList<Deal>("deals", [], (q) => q.is("deleted_at", null).order("position").order("created_at", { ascending: false }));

export const useActivities = (category: Activity["category"]) =>
  useCrmList<Activity>("activities", [category], (q) => q.eq("category", category).order("at", { ascending: false }).limit(2000));

export const useContactActivities = (contactId: string | null) =>
  useCrmList<Activity>("activities", ["contact", contactId], (q) => q.eq("contact_id", contactId).order("at", { ascending: false }), Boolean(contactId));

export const useServices = () => useCrmList<Service>("services", [], (q) => q.order("name"));

export const useProposals = () =>
  useCrmList<Proposal>("proposals", [], (q) => q.is("deleted_at", null).order("created_at", { ascending: false }));

export const useProposalItems = (proposalId: string | null) =>
  useCrmList<ProposalItem>("proposal_items", [proposalId], (q) => q.eq("proposal_id", proposalId).order("position"), Boolean(proposalId));

export const useJourney = () => useCrmList<JourneyItem>("journey_items", [], (q) => q.order("position").order("created_at"));

export const useScriptSegments = () => useCrmList<ScriptSegment>("script_segments", [], (q) => q.order("position").order("created_at"));

export const useScripts = () =>
  useCrmList<Script>("scripts", [], (q) => q.is("archived_at", null).order("created_at"));

/** Campanhas só para escolher em listas (o módulo de Marketing usa a tabela completa). */
export const useCampaignOptions = () =>
  useCrmList<{ id: string; name: string }>("campaigns", ["options"], (q) => q.is("deleted_at", null).order("created_at", { ascending: false }));

export const useChatThreads = () =>
  useCrmList<ChatThread>("chat_threads", [], (q) => q.order("last_message_at", { ascending: false }));

export const useChatMessages = (threadId: string | null) =>
  useCrmList<ChatMessage>("chat_messages", [threadId], (q) => q.eq("thread_id", threadId).order("at"), Boolean(threadId));

/* ------------------------------ Gravações ------------------------------ */

function translate(m: string) {
  if (m.includes("duplicate")) return "Já existe um registro com esse nome.";
  if (m.includes("name_check") || m.includes("title_check")) return "Preencha o nome.";
  return m;
}

/** Salvar (cria se não tiver id; devolve o id), atualizar campos e remover em qualquer tabela do comercial. */
export function useCrmMutations(table: CrmTable) {
  const qc = useQueryClient();
  const scope = useScope();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["crm"] });
    qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
    if (table === "proposals" || table === "deals") qc.invalidateQueries({ queryKey: ["fin"] });
  };
  const fail = (e: Error) => toast.error(`Não salvou: ${translate(e.message)}`);

  const save = useMutation({
    mutationFn: async (row: Record<string, unknown>): Promise<string> => {
      const { id, ...rest } = row;
      if (id) {
        const { error } = await supabase.from(table).update(rest).eq("id", id as string);
        if (error) throw error;
        return id as string;
      }
      const base: Record<string, unknown> = { workspace_id: scope.wsId };
      if (HAS_BUSINESS[table] && !("business_id" in rest)) base.business_id = scope.businessIdForNew;
      const { data, error } = await supabase.from(table).insert({ ...base, ...rest }).select("id").single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: invalidate,
    onError: fail,
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { error } = await supabase.from(table).update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const q = SOFT_DELETE.has(table)
        ? supabase.from(table).update({ deleted_at: new Date().toISOString() })
        : supabase.from(table).delete();
      const { error } = await q.eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(translate(e.message)),
  });

  return { save, patch, remove };
}

/** Grava os itens de uma proposta (substitui os anteriores). */
export function useSaveProposalItems() {
  const qc = useQueryClient();
  const scope = useScope();
  return useMutation({
    mutationFn: async ({ proposalId, items }: { proposalId: string; items: Omit<ProposalItem, "id" | "workspace_id" | "proposal_id">[] }) => {
      const del = await supabase.from("proposal_items").delete().eq("proposal_id", proposalId);
      if (del.error) throw del.error;
      if (!items.length) return;
      const { error } = await supabase.from("proposal_items")
        .insert(items.map((it, i) => ({ ...it, position: i, proposal_id: proposalId, workspace_id: scope.wsId })));
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm", "proposal_items"] }),
    onError: (e: Error) => toast.error(`Itens não salvos: ${e.message}`),
  });
}

/** Itens de uma proposta, sob demanda (ex.: para montar o texto de envio). */
export async function fetchProposalItems(proposalId: string): Promise<ProposalItem[]> {
  const { data, error } = await supabase.from("proposal_items").select("*").eq("proposal_id", proposalId).order("position");
  if (error) throw error;
  return (data ?? []) as ProposalItem[];
}

/** Carrega vários scripts de uma vez (biblioteca pronta de um segmento). */
export function useBulkInsertScripts() {
  const qc = useQueryClient();
  const scope = useScope();
  return useMutation({
    mutationFn: async (rows: Partial<Script>[]) => {
      const { error } = await supabase.from("scripts").insert(rows.map((r) => ({ ...r, workspace_id: scope.wsId })));
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm", "scripts"] }),
    onError: (e: Error) => toast.error(`Não carregou: ${e.message}`),
  });
}
