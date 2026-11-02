import { useState } from "react";
import { Check, Copy, FileEdit, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useDraftActions } from "@/hooks/useCentral";
import type { AssistantDraft, Contact } from "@/integrations/supabase/types";
import { waLink } from "@/lib/crm";

function DraftHead({ d, contact, phone }: { d: AssistantDraft; contact?: Contact; phone: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{d.title}</p>
        <p className="text-[11px] text-muted-foreground">{contact?.name ?? "Sem contato"}{phone ? ` · ${phone}` : " · sem telefone"}</p>
      </div>
      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{d.source_type === "proposta" ? "Proposta" : "Follow-up"}</span>
    </div>
  );
}

function DraftCard({ d, contact }: { d: AssistantDraft; contact?: Contact }) {
  const { approve, discard, saving } = useDraftActions();
  const [body, setBody] = useState(d.body);
  const phone = contact?.whatsapp ?? contact?.phone;
  const ok = async () => {
    const link = waLink(phone, body);
    if (link) window.open(link, "_blank", "noopener");
    else await navigator.clipboard?.writeText(body).catch(() => undefined);
    await approve(d, body);
    toast.success(link ? "Aprovado: WhatsApp aberto com a mensagem. Contato registrado no CRM." : "Aprovado e copiado (cliente sem telefone). Contato registrado no CRM.");
  };
  return (
    <Card className="space-y-2 p-3">
      <DraftHead d={d} contact={contact} phone={phone} />
      <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} aria-label={`Mensagem para ${contact?.name ?? d.title}`} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void ok()} disabled={saving || !body.trim()}>
          {phone ? <MessageCircle className="size-4" /> : <Check className="size-4" />}{phone ? "Aprovar e abrir WhatsApp" : "Aprovar e copiar"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard?.writeText(body); toast("Copiado."); }}><Copy className="size-4" />Copiar</Button>
        <Button size="sm" variant="ghost" onClick={() => discard(d)} aria-label={`Descartar ${d.title}`}><X className="size-4" />Descartar</Button>
      </div>
    </Card>
  );
}

/** Rascunhos que a varredura preparou. Nada é enviado sem você aprovar. */
export function DraftsList({ drafts, contacts }: { drafts: AssistantDraft[]; contacts: Contact[] }) {
  const byId = new Map(contacts.map((c) => [c.id, c]));
  return (
    <section className="space-y-2" aria-label="Rascunhos esperando aprovação">
      <h2 className="flex items-center gap-2 font-heading font-semibold"><FileEdit className="size-4 text-primary" />Rascunhos esperando aprovação <span className="text-sm font-normal text-muted-foreground">· {drafts.length}</span></h2>
      <p className="text-xs text-muted-foreground">Preparados nas varreduras a partir dos follow-ups e propostas paradas. Nada é enviado sem você aprovar.</p>
      {drafts.length === 0
        ? <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">Nenhum rascunho agora.</p>
        : <div className="grid gap-3 lg:grid-cols-2">{drafts.map((d) => <DraftCard key={d.id} d={d} contact={d.contact_id ? byId.get(d.contact_id) : undefined} />)}</div>}
    </section>
  );
}
