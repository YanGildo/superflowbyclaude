import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ClipboardList, Crosshair, MapPin, MessageCircle, MessageSquareText, Search, Send, UserPlus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useConvertProspect } from "@/hooks/useConvertProspect";
import { useProspectActions } from "@/hooks/useProspects";
import type { Prospect, ProspectCampaign } from "@/integrations/supabase/types";
import { waLink } from "@/lib/crm";
import { Badges, ContactLines, History, NotesBox, Origin, Pickers, Section } from "./ProspectSheetParts";
import { ProspectScriptDialog } from "./ProspectScriptDialog";

function Triage({ p }: { p: Prospect }) {
  const { record } = useProspectActions();
  const to = (status: string, kind: string) => record.mutate({ p, kind, values: { status } });
  return (
    <Section title="Triagem">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={() => to("Em análise", "Marcado em análise")}><Search className="size-4" />Marcar em análise</Button>
        <Button variant="outline" size="sm" onClick={() => to("Qualificado", "Qualificado")}><CheckCircle2 className="size-4" />Qualificar</Button>
        <Button variant="outline" size="sm" onClick={() => to("Para abordar", "Selecionado para abordagem")}><Crosshair className="size-4" />Para abordar</Button>
        <Button variant="outline" size="sm" className="hover:text-destructive" onClick={() => to("Descartado", "Descartado")}><XCircle className="size-4" />Descartar</Button>
      </div>
    </Section>
  );
}

function Contact({ p, onScript }: { p: Prospect; onScript: () => void }) {
  const { record } = useProspectActions();
  const [note, setNote] = useState("");
  const wa = waLink(p.whatsapp ?? p.phone, `Olá! Tudo bem? Falo com a ${p.name}?`);
  const log = () => {
    record.mutate({ p, kind: "Abordagem registrada", note: note.trim() || null, values: { status: p.status === "Virou lead" ? p.status : "Abordado", last_approach_at: new Date().toISOString() } });
    setNote("");
  };
  return (
    <Section title="Contato">
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Como foi a abordagem? (opcional)" aria-label="Nota da abordagem"
        className="h-9 w-full rounded-md border bg-background px-3 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={log}><Send className="size-4" />Registrar abordagem</Button>
        <Button variant="outline" size="sm" onClick={onScript}><MessageSquareText className="size-4" />Usar script</Button>
        {wa ? <Button variant="outline" size="sm" asChild><a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />WhatsApp</a></Button>
          : <Button variant="outline" size="sm" disabled><MessageCircle className="size-4" />Sem telefone</Button>}
        {p.maps_url ? <Button variant="outline" size="sm" asChild><a href={p.maps_url} target="_blank" rel="noreferrer"><MapPin className="size-4" />Google Maps</a></Button>
          : <Button variant="outline" size="sm" disabled><MapPin className="size-4" />Sem Maps</Button>}
      </div>
    </Section>
  );
}

function Commercial({ p }: { p: Prospect }) {
  const convert = useConvertProspect();
  return (
    <Section title="Comercial">
      {p.converted_contact_id
        ? <Button variant="outline" size="sm" asChild><Link to="/comercial"><ClipboardList className="size-4" />Já virou lead · abrir Comercial</Link></Button>
        : <Button size="sm" variant="outline" onClick={() => void convert(p)}><UserPlus className="size-4" />Criar lead</Button>}
    </Section>
  );
}

/** Painel lateral do prospect: triagem, contato, observações, histórico e origem dos dados. */
export function ProspectSheet({ p, campaigns, onClose }: { p: Prospect | null; campaigns: ProspectCampaign[]; onClose: () => void }) {
  const { record } = useProspectActions();
  const [script, setScript] = useState(false);
  return (
    <Sheet open={Boolean(p)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {p && (
          <div className="space-y-5">
            <SheetHeader className="space-y-1.5 text-left">
              <SheetTitle className="pr-6 font-heading text-lg leading-snug">{p.name}</SheetTitle>
              <SheetDescription>{[p.category, p.city].filter(Boolean).join(" · ") || "Prospect"}</SheetDescription>
              <Badges p={p} />
            </SheetHeader>
            <Pickers p={p} campaigns={campaigns} />
            <ContactLines p={p} />
            <NotesBox p={p} />
            {p.status !== "Para abordar" && p.status !== "Virou lead" && (
              <Button className="w-full" onClick={() => record.mutate({ p, kind: "Selecionado para abordagem", values: { status: "Para abordar" } })}><Crosshair className="size-4" />Selecionar para abordagem</Button>
            )}
            <Triage p={p} />
            <Contact p={p} onScript={() => setScript(true)} />
            <Commercial p={p} />
            {p.score_reasons?.length > 0 && (
              <Section title="Motivos da pontuação"><ul className="list-disc space-y-0.5 pl-5 text-sm">{p.score_reasons.map((r) => <li key={r}>{r}</li>)}</ul></Section>
            )}
            <Section title="Histórico"><History p={p} /></Section>
            <Section title="Origem"><Origin p={p} /></Section>
            <ProspectScriptDialog p={p} open={script} onOpenChange={setScript} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
