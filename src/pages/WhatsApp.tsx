import { useEffect, useMemo, useState } from "react";
import { MessagesSquare, Plus, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { ChatPane } from "@/components/whatsapp/ChatPane";
import { LeadPanel } from "@/components/whatsapp/LeadPanel";
import { NewChatDialog } from "@/components/whatsapp/NewChatDialog";
import { ThreadList } from "@/components/whatsapp/ThreadList";
import { useChatThreads, useContacts, useDeals, useScriptSegments, useScripts, useStages } from "@/hooks/useCrm";

/** Conversas, contatos, oportunidades e os scripts favoritos do segmento padrão (modelos rápidos). */
function useWhatsAppData() {
  const { data: threads = [] } = useChatThreads();
  const { data: contacts = [] } = useContacts();
  const { data: deals = [] } = useDeals();
  const { data: stages = [] } = useStages();
  const { data: segments = [] } = useScriptSegments();
  const { data: scripts = [] } = useScripts();
  const seg = segments.find((s) => s.is_default && !s.archived_at) ?? segments[0];
  const templates = scripts.filter((s) => s.segment_id === seg?.id && s.favorite);
  const byId = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  return { threads, byId, deals, stages, templates, vars: seg?.variables ?? {} };
}

export default function WhatsApp() {
  const d = useWhatsAppData();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  useEffect(() => { if (!activeId && d.threads[0]) setActiveId(d.threads[0].id); }, [activeId, d.threads]);

  const thread = d.threads.find((t) => t.id === activeId);
  const contact = thread ? d.byId.get(thread.contact_id) : undefined;
  const deal = contact ? d.deals.find((x) => x.contact_id === contact.id) : undefined;
  const stages = d.stages.filter((s) => s.pipeline_id === deal?.pipeline_id);

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="CRM Agência" title="WhatsApp simulado" description="Teste conversas comerciais sem a API real. Tudo fica no CRM."
        actions={<Button onClick={() => setCreating(true)}><Plus className="size-4" />Nova conversa</Button>} />
      <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground dark:text-warning">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <p><b>Ambiente simulado:</b> nenhuma mensagem é enviada de verdade. A integração real com o WhatsApp entra na fase de integrações e usa estas mesmas conversas.</p>
      </div>
      {d.threads.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="Nenhuma conversa ainda" description="Abra uma conversa com um lead do CRM ou cadastre um novo."
          action={<Button onClick={() => setCreating(true)}><Plus className="size-4" />Nova conversa</Button>} />
      ) : (
        <div className="grid h-[calc(100vh-15rem)] min-h-[520px] gap-3 lg:grid-cols-[260px_1fr_300px]">
          <ThreadList threads={d.threads} contacts={d.byId} activeId={activeId} onSelect={setActiveId} />
          {thread ? <ChatPane thread={thread} contact={contact} templates={d.templates} vars={d.vars} /> : <div />}
          {thread && contact ? <LeadPanel c={contact} deal={deal} stages={stages} threadId={thread.id} onDeleted={() => setActiveId(null)} /> : <div />}
        </div>
      )}
      <NewChatDialog open={creating} onOpenChange={setCreating} onOpened={setActiveId} />
    </div>
  );
}
