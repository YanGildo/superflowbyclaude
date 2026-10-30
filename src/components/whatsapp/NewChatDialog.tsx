import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefSelect } from "@/components/common/RefSelect";
import { useChat } from "@/hooks/useChat";
import { useContacts, usePipelines, useStages } from "@/hooks/useCrm";
import { useCrmFlows } from "@/hooks/useCrmFlows";

/** Conversa com um contato existente ou com um lead novo (que já entra no pipeline). */
export function NewChatDialog({ open, onOpenChange, onOpened }: { open: boolean; onOpenChange: (o: boolean) => void; onOpened: (threadId: string) => void }) {
  const { data: contacts = [] } = useContacts();
  const { data: pipelines = [] } = usePipelines();
  const { data: stages = [] } = useStages();
  const { openThread } = useChat();
  const { createLead } = useCrmFlows();
  const [contactId, setContactId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    let id = contactId;
    if (!id) {
      const pl = pipelines[0];
      const first = stages.filter((s) => s.pipeline_id === pl?.id)[0];
      if (!name.trim() || !pl || !first) return;
      id = await createLead.mutateAsync({ name, company: "", phone, email: "", source: "WhatsApp", service: null, stageId: first.id, pipelineId: pl.id, notes: "" });
    }
    const threadId = await openThread.mutateAsync(id);
    setContactId(null); setName(""); setPhone("");
    onOpenChange(false);
    onOpened(threadId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Nova conversa</DialogTitle>
          <DialogDescription>Escolha um contato do CRM ou cadastre um lead novo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nc-contact">Contato existente</Label>
            <RefSelect id="nc-contact" value={contactId} onChange={setContactId} options={contacts} placeholder="Lead novo" />
          </div>
          {!contactId && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="nc-name">Nome</Label><Input id="nc-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="nc-phone">WhatsApp</Label><Input id="nc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!contactId && !name.trim()}>Abrir conversa</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
