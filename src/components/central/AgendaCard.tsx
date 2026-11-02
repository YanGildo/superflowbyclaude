import { useEffect, useState } from "react";
import { CalendarDays, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefSelect } from "@/components/common/RefSelect";
import { AreaField, Field, FormShell, TextField } from "@/components/marketing/FormShell";
import { useContacts, useCrmMutations } from "@/hooks/useCrm";
import type { Appointment } from "@/integrations/supabase/types";
import { localISODate } from "@/lib/format";
import { shortDate } from "@/lib/labels";

type Form = { title: string; date: string; start: string; end: string; location: string; link: string; contact_id: string | null; notes: string };
const blank = (): Form => ({ title: "", date: localISODate(), start: "09:00", end: "", location: "", link: "", contact_id: null, notes: "" });
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function AppointmentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { save } = useCrmMutations("appointments");
  const { data: contacts = [] } = useContacts();
  const [f, setF] = useState<Form>(blank);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setF(blank()); setError(null); } }, [open]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => {
    if (!f.title.trim()) return setError("Dê um título ao compromisso.");
    if (!f.date || !f.start) return setError("Informe data e hora.");
    await save.mutateAsync({
      title: f.title.trim(), starts_at: new Date(`${f.date}T${f.start}`).toISOString(), ends_at: f.end ? new Date(`${f.date}T${f.end}`).toISOString() : null,
      location: f.location.trim() || null, link: f.link.trim() || null, contact_id: f.contact_id, notes: f.notes.trim() || null,
    });
    onOpenChange(false);
  };
  return (
    <FormShell open={open} onOpenChange={onOpenChange} onSubmit={submit} error={error} pending={save.isPending} title="Novo compromisso"
      description="Agenda do Superflow. Quando o Google Agenda for conectado, os dois se sincronizam.">
      <TextField id="ap-title" label="Título *" wide autoFocus value={f.title} onChange={(v) => set("title", v)} placeholder="Ex.: Reunião com a Clínica Sorriso" />
      <TextField id="ap-date" label="Data" type="date" value={f.date} onChange={(v) => set("date", v)} />
      <div className="grid grid-cols-2 gap-2">
        <TextField id="ap-start" label="Início" type="time" value={f.start} onChange={(v) => set("start", v)} />
        <TextField id="ap-end" label="Fim" type="time" value={f.end} onChange={(v) => set("end", v)} />
      </div>
      <TextField id="ap-loc" label="Local" value={f.location} onChange={(v) => set("location", v)} placeholder="Endereço ou online" />
      <TextField id="ap-link" label="Link da reunião" value={f.link} onChange={(v) => set("link", v)} placeholder="https://meet.google.com/…" />
      <Field id="ap-contact" label="Cliente / lead" wide>
        <RefSelect id="ap-contact" value={f.contact_id} onChange={(v) => set("contact_id", v)} options={contacts} placeholder="Nenhum" />
      </Field>
      <AreaField id="ap-notes" label="Observações" value={f.notes} onChange={(v) => set("notes", v)} />
    </FormShell>
  );
}

function Row({ a }: { a: Appointment }) {
  const { remove } = useCrmMutations("appointments");
  const today = localISODate(new Date(a.starts_at)) === localISODate();
  return (
    <div className="group flex items-center gap-3 border-b px-3 py-2 last:border-0">
      <div className="w-16 shrink-0 text-xs"><p className="font-semibold tabular-nums">{hhmm(a.starts_at)}</p><p className="text-muted-foreground">{today ? "hoje" : shortDate(a.starts_at.slice(0, 10))}</p></div>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{a.title}</p>{a.location && <p className="truncate text-[11px] text-muted-foreground">{a.location}</p>}</div>
      {a.link && <Button asChild size="icon" variant="ghost" className="size-8"><a href={a.link} target="_blank" rel="noreferrer" aria-label={`Abrir link de ${a.title}`}><ExternalLink className="size-4" /></a></Button>}
      <button type="button" aria-label={`Excluir ${a.title}`} onClick={() => remove.mutate(a.id)} className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"><Trash2 className="size-4" /></button>
    </div>
  );
}

/** Agenda: compromissos de hoje e dos próximos 7 dias. */
export function AgendaCard({ list }: { list: Appointment[] }) {
  const [open, setOpen] = useState(false);
  const limit = Date.now() + 7 * 864e5;
  const next = list.filter((a) => new Date(a.ends_at ?? a.starts_at).getTime() >= Date.now() - 30 * 60000 && new Date(a.starts_at).getTime() <= limit);
  return (
    <section id="agenda" className="space-y-2" aria-label="Agenda">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading font-semibold"><CalendarDays className="size-4 text-primary" />Agenda · próximos 7 dias</h2>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="size-4" />Compromisso</Button>
      </div>
      {next.length === 0
        ? <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">Nenhum compromisso. Adicione reuniões e gravações aqui.</p>
        : <Card className="overflow-hidden">{next.map((a) => <Row key={a.id} a={a} />)}</Card>}
      <AppointmentDialog open={open} onOpenChange={setOpen} />
    </section>
  );
}
