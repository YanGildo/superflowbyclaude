import { useState } from "react";
import { toast } from "sonner";
import { CheckSquare, FileText, Mail, MessageCircle, MessageSquarePlus, Pencil, XCircle } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefSelect } from "@/components/common/RefSelect";
import { useCrmMutations } from "@/hooks/useCrm";
import { useTaskMutations } from "@/hooks/useTasks";
import type { Contact, Deal, PipelineStage, Temperature } from "@/integrations/supabase/types";
import { CONTACT_STATUS, TEMPERATURE, waLink } from "@/lib/crm";
import { brl, localISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ActivityDialog } from "./ActivityDialog";
import { ContactDialog } from "./ContactDialog";
import { ContactTimeline } from "./ContactTimeline";
import { ProposalDialog } from "./ProposalDialog";

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><div className="text-sm">{children}</div></div>;
}

function ContactInfo({ c }: { c: Contact }) {
  const wa = waLink(c.whatsapp ?? c.phone);
  return (
    <div className="grid grid-cols-2 gap-3">
      <InfoRow label="WhatsApp">{wa ? <a href={wa} target="_blank" rel="noreferrer" className="text-success hover:underline">{c.whatsapp ?? c.phone}</a> : "—"}</InfoRow>
      <InfoRow label="E-mail">{c.email ? <a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a> : "—"}</InfoRow>
      <InfoRow label="Origem">{c.source ?? "—"}</InfoRow>
      <InfoRow label="Segmento">{c.segment ?? "—"}</InfoRow>
      <InfoRow label="Plano">{c.plan_name ?? "—"}{c.monthly_value ? ` · ${brl(Number(c.monthly_value))}/mês` : ""}</InfoRow>
      <InfoRow label="Próxima ação">{c.next_action ?? "—"}</InfoRow>
      {c.services.length > 0 && (
        <div className="col-span-2 flex flex-wrap gap-1">{c.services.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
      )}
      {c.notes && <p className="col-span-2 whitespace-pre-wrap rounded-md bg-muted/60 p-2 text-sm text-muted-foreground">{c.notes}</p>}
    </div>
  );
}

function TemperatureToggle({ c }: { c: Contact }) {
  const { patch } = useCrmMutations("contacts");
  return (
    <div className="flex gap-1">
      {(Object.keys(TEMPERATURE) as Temperature[]).map((t) => (
        <button key={t} type="button" aria-pressed={c.temperature === t}
          onClick={() => patch.mutate({ id: c.id, values: { temperature: c.temperature === t ? null : t } })}
          className={cn("rounded-full border px-2.5 py-0.5 text-xs", c.temperature === t ? TEMPERATURE[t].tone + " border-current" : "text-muted-foreground hover:bg-accent")}>
          {TEMPERATURE[t].label}
        </button>
      ))}
    </div>
  );
}

type Dlg = "edit" | "activity" | "proposal" | null;

function QuickActions({ c, deal, stages, open }: { c: Contact; deal?: Deal; stages: PipelineStage[]; open: (d: Dlg) => void }) {
  const { create } = useTaskMutations();
  const dealM = useCrmMutations("deals");
  const lost = stages.find((s) => s.outcome === "lost");
  const followUp = async () => {
    await create.mutateAsync({ title: `Follow-up: ${c.name}`, contact_id: c.id, due_date: localISODate(), my_day_date: localISODate() });
    toast.success("Tarefa criada no seu dia.");
  };
  const wa = waLink(c.whatsapp ?? c.phone);
  return (
    <div className="grid grid-cols-2 gap-2">
      {wa && <Button asChild variant="outline" size="sm"><a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="size-4 text-success" />WhatsApp</a></Button>}
      {c.email && <Button asChild variant="outline" size="sm"><a href={`mailto:${c.email}`}><Mail className="size-4" />E-mail</a></Button>}
      <Button variant="outline" size="sm" onClick={() => open("activity")}><MessageSquarePlus className="size-4" />Registrar contato</Button>
      <Button variant="outline" size="sm" onClick={() => open("proposal")}><FileText className="size-4" />Nova proposta</Button>
      <Button variant="outline" size="sm" onClick={followUp}><CheckSquare className="size-4" />Criar tarefa</Button>
      <Button variant="outline" size="sm" onClick={() => open("edit")}><Pencil className="size-4" />Editar cadastro</Button>
      {deal && lost && deal.stage_id !== lost.id && (
        <Button variant="outline" size="sm" className="text-destructive" onClick={() => dealM.patch.mutate({ id: deal.id, values: { stage_id: lost.id } })}>
          <XCircle className="size-4" />Marcar como perdido
        </Button>
      )}
    </div>
  );
}

/** Ficha do lead/cliente: dados, etapa, ações rápidas e histórico. */
export function ContactSheet({ contact, deal, stages, onClose }: {
  contact: Contact | null; deal?: Deal; stages: PipelineStage[]; onClose: () => void;
}) {
  const [dlg, setDlg] = useState<Dlg>(null);
  const dealM = useCrmMutations("deals");
  const c = contact;

  return (
    <>
      <Sheet open={Boolean(c)} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full space-y-5 overflow-y-auto sm:max-w-lg">
          {c && (
            <>
              <SheetHeader className="space-y-1 text-left">
                <span className={cn("w-fit rounded-full px-2 py-0.5 text-[11px] font-medium", CONTACT_STATUS[c.status].tone)}>{CONTACT_STATUS[c.status].label}</span>
                <SheetTitle className="font-heading text-xl">{c.name}</SheetTitle>
                <SheetDescription>{c.company ?? (c.kind === "empresa" ? "Empresa" : "Pessoa")}{c.city ? ` · ${c.city}` : ""}</SheetDescription>
              </SheetHeader>
              <TemperatureToggle c={c} />
              {deal && (
                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Etapa do funil</p>
                  <RefSelect value={deal.stage_id} onChange={(v) => v && dealM.patch.mutate({ id: deal.id, values: { stage_id: v } })} options={stages} placeholder="Etapa" />
                </div>
              )}
              <QuickActions c={c} deal={deal} stages={stages} open={setDlg} />
              <ContactInfo c={c} />
              <div className="space-y-2">
                <p className="brand-eyebrow">Histórico</p>
                <ContactTimeline contactId={c.id} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <ContactDialog open={dlg === "edit"} onOpenChange={(o) => !o && setDlg(null)} contact={c} />
      <ActivityDialog open={dlg === "activity"} onOpenChange={(o) => !o && setDlg(null)} category="contato" contactId={c?.id ?? null} defaultType="Mensagem" />
      <ProposalDialog open={dlg === "proposal"} onOpenChange={(o) => !o && setDlg(null)} contactId={c?.id ?? null} />
    </>
  );
}
