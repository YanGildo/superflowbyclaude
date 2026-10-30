import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight, CalendarClock, CheckCircle2, CheckSquare, FileText, Flame, MessageSquarePlus, Trash2, UserCheck, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefSelect } from "@/components/common/RefSelect";
import { ActivityDialog } from "@/components/crm/ActivityDialog";
import { ContactTimeline } from "@/components/crm/ContactTimeline";
import { ProposalDialog } from "@/components/crm/ProposalDialog";
import { useChat } from "@/hooks/useChat";
import { useCrmMutations } from "@/hooks/useCrm";
import { useTaskMutations } from "@/hooks/useTasks";
import type { Contact, Deal, PipelineStage, Temperature } from "@/integrations/supabase/types";
import { TEMPERATURE } from "@/lib/crm";
import { localISODate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Dlg = "activity" | "proposal" | null;

const tomorrow = () => localISODate(new Date(Date.now() + 864e5));
const byName = (stages: PipelineStage[], prefix: string) => stages.find((s) => s.name.toLowerCase().startsWith(prefix));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>{children}</div>;
}

function NextAction({ c }: { c: Contact }) {
  const { patch } = useCrmMutations("contacts");
  const [v, setV] = useState(c.next_action ?? "");
  useEffect(() => setV(c.next_action ?? ""), [c.id, c.next_action]);
  const save = () => { if (v !== (c.next_action ?? "")) patch.mutate({ id: c.id, values: { next_action: v.trim() || null } }); };
  return <Input value={v} onChange={(e) => setV(e.target.value)} onBlur={save} placeholder="Ex.: Confirmar reunião" aria-label="Próxima ação" className="h-8" />;
}

function Temperatures({ c }: { c: Contact }) {
  const { patch } = useCrmMutations("contacts");
  return (
    <div className="grid grid-cols-3 gap-1">
      {(Object.keys(TEMPERATURE) as Temperature[]).map((t) => (
        <button key={t} type="button" aria-pressed={c.temperature === t} onClick={() => patch.mutate({ id: c.id, values: { temperature: t } })}
          className={cn("rounded-md border py-1 text-xs", c.temperature === t ? TEMPERATURE[t].tone + " border-current font-medium" : "hover:bg-accent")}>{TEMPERATURE[t].label}</button>
      ))}
    </div>
  );
}

/** Ações do painel: mexem no funil, criam tarefas e abrem registro/proposta. */
function useLeadActions(c: Contact, deal: Deal | undefined, stages: PipelineStage[]) {
  const dealM = useCrmMutations("deals");
  const contactM = useCrmMutations("contacts");
  const { create } = useTaskMutations();
  const toStage = (s?: PipelineStage) => { if (deal && s) dealM.patch.mutate({ id: deal.id, values: { stage_id: s.id } }); };
  const task = async (title: string, due: string) => { await create.mutateAsync({ title, contact_id: c.id, due_date: due }); toast.success("Tarefa criada."); };
  return {
    qualify: () => toStage(byName(stages, "diagn")),
    hot: () => contactM.patch.mutate({ id: c.id, values: { temperature: "quente" } }),
    negotiate: () => toStage(byName(stages, "em negocia")),
    won: () => toStage(stages.find((s) => s.outcome === "won")),
    lost: () => toStage(stages.find((s) => s.outcome === "lost")),
    task: () => task(`Falar com ${c.name}`, localISODate()),
    followUp: () => task(`Follow-up: ${c.name}`, tomorrow()),
  };
}

function ActionList({ act, open, hasDeal }: { act: ReturnType<typeof useLeadActions>; open: (d: Dlg) => void; hasDeal: boolean }) {
  const items: [typeof UserCheck, string, () => void, boolean?][] = [
    [UserCheck, "Qualificar lead", act.qualify, !hasDeal], [Flame, "Marcar como quente", act.hot],
    [CheckSquare, "Criar tarefa", act.task], [CalendarClock, "Agendar follow-up (amanhã)", act.followUp],
    [MessageSquarePlus, "Registrar contato", () => open("activity")], [FileText, "Enviar proposta", () => open("proposal")],
    [ArrowRight, "Mover para negociação", act.negotiate, !hasDeal], [CheckCircle2, "Marcar como fechado", act.won, !hasDeal],
    [XCircle, "Marcar como perdido", act.lost, !hasDeal],
  ];
  return (
    <div className="space-y-1">
      {items.map(([Icon, label, fn, disabled]) => (
        <button key={label} type="button" onClick={fn} disabled={disabled}
          className="flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent disabled:opacity-40">
          <Icon className="size-3.5 text-muted-foreground" />{label}
        </button>
      ))}
    </div>
  );
}

export function LeadPanel({ c, deal, stages, threadId, onDeleted }: {
  c: Contact; deal?: Deal; stages: PipelineStage[]; threadId: string; onDeleted: () => void;
}) {
  const dealM = useCrmMutations("deals");
  const { removeThread } = useChat();
  const act = useLeadActions(c, deal, stages);
  const [dlg, setDlg] = useState<Dlg>(null);

  return (
    <aside className="min-h-0 space-y-4 overflow-y-auto rounded-xl border bg-card p-4">
      <Section title="Lead">
        <p className="font-heading font-semibold">{c.name}</p>
        <p className="text-xs text-muted-foreground">{c.whatsapp ?? c.phone ?? "sem telefone"}</p>
      </Section>
      <Section title="Interesse"><p className="text-sm">{c.services.join(", ") || "—"}</p></Section>
      <Section title="Etapa do funil">
        {deal ? <RefSelect value={deal.stage_id} onChange={(v) => v && dealM.patch.mutate({ id: deal.id, values: { stage_id: v } })} options={stages} placeholder="Etapa" />
          : <p className="text-xs text-muted-foreground">Sem oportunidade no pipeline.</p>}
      </Section>
      <Section title="Temperatura"><Temperatures c={c} /></Section>
      <Section title="Próxima ação"><NextAction c={c} /></Section>
      <Section title="Ações"><ActionList act={act} open={setDlg} hasDeal={Boolean(deal)} /></Section>
      <Section title="Histórico de eventos"><ContactTimeline contactId={c.id} /></Section>
      <Button variant="ghost" size="sm" className="w-full justify-start text-destructive" onClick={() => { removeThread.mutate(threadId); onDeleted(); }}>
        <Trash2 className="size-4" />Excluir conversa
      </Button>
      <ActivityDialog open={dlg === "activity"} onOpenChange={(o) => !o && setDlg(null)} category="contato" contactId={c.id} defaultType="Mensagem" />
      <ProposalDialog open={dlg === "proposal"} onOpenChange={(o) => !o && setDlg(null)} contactId={c.id} />
    </aside>
  );
}
