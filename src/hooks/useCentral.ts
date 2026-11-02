// Central do dia: dados de todas as fontes, configurações do assistente, rascunhos e varredura.
import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Appointment, AssistantDigest, AssistantDraft } from "@/integrations/supabase/types";
import { useContacts, useCrmList, useCrmMutations, useProposals } from "@/hooks/useCrm";
import { usePayables, useReceivables } from "@/hooks/useFinance";
import { useContentItems, useDeliveries } from "@/hooks/useMarketing";
import { useProspects } from "@/hooks/useProspects";
import { useScope } from "@/hooks/useScope";
import { useAllTasks } from "@/hooks/useTasks";
import { readAssistant, type AssistantSettings } from "@/lib/assistant";
import { handledToday, needsMe, summary } from "@/lib/central";
import { localISODate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export const useAppointments = () =>
  useCrmList<Appointment>("appointments", [], (q) => q.gte("starts_at", new Date(Date.now() - 864e5).toISOString()).order("starts_at").limit(500));

export const useDrafts = () =>
  useCrmList<AssistantDraft>("assistant_drafts", [], (q) => q.gte("created_at", new Date(Date.now() - 2 * 864e5).toISOString()).order("created_at", { ascending: false }).limit(300));

export const useLastDigest = () =>
  useCrmList<AssistantDigest>("assistant_digests", [], (q) => q.order("created_at", { ascending: false }).limit(1));

/** Configurações do assistente (nome, mascote, horários, fontes, modelos). */
export function useAssistantSettings() {
  const { workspace, refresh } = useWorkspace();
  const settings = readAssistant(workspace?.settings?.assistente);
  const save = useMutation({
    mutationFn: async (s: AssistantSettings) => {
      const { error } = await supabase.from("workspaces").update({ settings: { ...(workspace?.settings ?? {}), assistente: s } }).eq("id", workspace?.id ?? "");
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast.success("Assistente salvo."); },
    onError: (e: Error) => toast.error(e.message),
  });
  return { settings, save };
}

/** Tudo que a Central precisa, já calculado. */
export function useCentral() {
  const { settings } = useAssistantSettings();
  const tasks = useAllTasks();
  const { data: payables = [] } = usePayables();
  const { data: receivables = [] } = useReceivables();
  const { data: contacts = [] } = useContacts();
  const { data: proposals = [] } = useProposals();
  const { data: deliveries = [] } = useDeliveries();
  const { data: content = [] } = useContentItems();
  const { data: prospects = [] } = useProspects();
  const { data: appointments = [] } = useAppointments();
  const { data: drafts = [] } = useDrafts();
  const { data: digest = [] } = useLastDigest();

  return useMemo(() => {
    const input = { tasks: tasks.data ?? [], payables, receivables, contacts, proposals, deliveries, content, prospects, appointments, drafts };
    const items = needsMe(input, settings);
    const pending = drafts.filter((d) => d.status === "pendente");
    return {
      loading: tasks.isLoading, settings, items, pending, contacts, appointments,
      handled: handledToday(input), summary: summary(items, pending.length), lastScan: digest[0] ?? null,
    };
  }, [tasks.data, tasks.isLoading, settings, payables, receivables, contacts, proposals, deliveries, content, prospects, appointments, drafts, digest]);
}

/** Aprovar (registra o contato no CRM), editar ou descartar um rascunho; e varrer agora. */
export function useDraftActions() {
  const qc = useQueryClient();
  const scope = useScope();
  const drafts = useCrmMutations("assistant_drafts");
  const activities = useCrmMutations("activities");

  const approve = async (d: AssistantDraft, body: string) => {
    // Follow-up feito: tira a data de próximo contato (antes de gravar, para a lista já voltar atualizada).
    if (d.source_type === "followup" && d.contact_id) {
      await supabase.from("contacts").update({ next_contact_at: null }).eq("id", d.contact_id);
    }
    await drafts.patch.mutateAsync({ id: d.id, values: { status: "aprovado", body, decided_at: new Date().toISOString() } });
    await activities.save.mutateAsync({
      category: "contato", type: d.source_type === "proposta" ? "Follow-up" : "Mensagem", channel: "WhatsApp",
      summary: d.title, notes: body, contact_id: d.contact_id, business_id: d.business_id, outcome: "fechado", at: new Date().toISOString(),
    });
    qc.invalidateQueries({ queryKey: ["crm"] });
  };

  const discard = (d: AssistantDraft) =>
    drafts.patch.mutate({ id: d.id, values: { status: "descartado", decided_at: new Date().toISOString() } });

  const scan = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("assistant_scan_now", { ws: scope.wsId });
      if (error) throw error;
      return data as Record<string, number>;
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["crm"] });
      toast.success(c.rascunhos ? `Varredura feita: ${c.rascunhos} rascunho(s) esperando aprovação.` : "Varredura feita: nenhum rascunho novo.");
    },
    onError: (e: Error) => toast.error(`Não consegui varrer: ${e.message}`),
  });

  return { approve, discard, scan, saving: drafts.patch.isPending };
}

export const isToday = (iso: string) => localISODate(new Date(iso)) === localISODate();
