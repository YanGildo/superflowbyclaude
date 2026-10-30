import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefSelect } from "@/components/common/RefSelect";
import { useServices } from "@/hooks/useCrm";
import { useCrmFlows } from "@/hooks/useCrmFlows";
import type { PipelineStage } from "@/integrations/supabase/types";
import { SOURCES } from "@/lib/crm";

type Form = { name: string; company: string; phone: string; email: string; source: string | null; service: string | null; stageId: string; notes: string };

const asOptions = (list: string[]) => list.map((s) => ({ id: s, name: s }));

export function LeadDialog({ open, onOpenChange, stages, pipelineId, initialStageId }: {
  open: boolean; onOpenChange: (o: boolean) => void; stages: PipelineStage[]; pipelineId: string; initialStageId?: string;
}) {
  const { data: services = [] } = useServices();
  const { createLead } = useCrmFlows();
  const [f, setF] = useState<Form>({ name: "", company: "", phone: "", email: "", source: null, service: null, stageId: "", notes: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setF({ name: "", company: "", phone: "", email: "", source: null, service: null, stageId: initialStageId ?? stages[0]?.id ?? "", notes: "" });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return setError("Informe o nome do lead.");
    if (!f.stageId) return setError("Escolha a etapa inicial.");
    await createLead.mutateAsync({ ...f, pipelineId });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Novo lead</DialogTitle>
          <DialogDescription>Entra no pipeline e já fica registrado em Conversões.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lead-name">Nome *</Label>
            <Input id="lead-name" value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-company">Empresa</Label>
            <Input id="lead-company" value={f.company} onChange={(e) => set("company", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-phone">WhatsApp / telefone</Label>
            <Input id="lead-phone" inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lead-email">E-mail</Label>
            <Input id="lead-email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-source">Origem</Label>
            <RefSelect id="lead-source" value={f.source} onChange={(v) => set("source", v)} options={asOptions(SOURCES)} placeholder="Selecione" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-service">Serviço de interesse</Label>
            <RefSelect id="lead-service" value={f.service} onChange={(v) => set("service", v)}
              options={asOptions(services.filter((s) => s.active).map((s) => s.name))} placeholder="Selecione" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lead-stage">Etapa inicial</Label>
            <RefSelect id="lead-stage" value={f.stageId || null} onChange={(v) => set("stageId", v ?? "")} options={stages} placeholder="Escolha a etapa" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lead-notes">Observações</Label>
            <Textarea id="lead-notes" rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={createLead.isPending}>{createLead.isPending && <Loader2 className="size-4 animate-spin" />}Salvar lead</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
