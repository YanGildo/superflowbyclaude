import { useEffect, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCrmMutations } from "@/hooks/useCrm";
import { useRecordings } from "@/hooks/useContent";
import { useContentItems } from "@/hooks/useMarketing";
import type { Recording } from "@/integrations/supabase/types";
import { REC_STATUS, parseTopics, promptMapa } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Choice, CopyPrompt, Empty, Field, LinkOut } from "./ContentBits";

function Detail({ r }: { r: Recording }) {
  const { save, remove } = useCrmMutations("recordings");
  const items = useCrmMutations("content_items");
  const { data: all = [] } = useContentItems();
  const pieces = all.filter((c) => c.recording_id === r.id);
  const [audio, setAudio] = useState(r.audio_url ?? "");
  const [tr, setTr] = useState(r.transcript ?? "");
  const [csv, setCsv] = useState("");
  useEffect(() => { setAudio(r.audio_url ?? ""); setTr(r.transcript ?? ""); }, [r.id, r.audio_url, r.transcript]);
  const saveText = () => save.mutate({ id: r.id, audio_url: audio.trim() || null, transcript: tr.trim() || null, status: tr.trim() && ["pauta", "gravado"].includes(r.status) ? "transcrito" : r.status }, { onSuccess: () => toast.success("Gravação salva.") });
  const importTopics = () => { const t = parseTopics(csv); save.mutate({ id: r.id, topics: t }, { onSuccess: () => { setCsv(""); toast.success(`${t.length} assunto(s) na pauta.`); } }); };
  const newPiece = (title: string) => items.save.mutate({ title, recording_id: r.id, stage: "ideia", kind: "Reels", channel: "Instagram" }, { onSuccess: () => toast.success("Peça criada em Produção.") });
  return (
    <div className="space-y-3 border-t p-3">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Pauta ({r.topics.length} assuntos · {r.topics.reduce((a, t) => a + (t.minutos ?? 0), 0)} min)</p>
        {r.topics.length > 0 && (
          <ul className="space-y-1 text-sm">{r.topics.map((t, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <span className="flex-1"><strong>{t.assunto}</strong>{[t.caso, t.numero, t.formato, t.minutos ? `${t.minutos} min` : ""].filter(Boolean).map((x) => ` · ${x}`).join("")}</span>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => newPiece(t.assunto)}>Virar peça</Button>
            </li>
          ))}</ul>
        )}
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Textarea rows={2} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="Cole a pauta em CSV (assunto,caso,numero,formato,minutos)" aria-label="Pauta em CSV" />
          <Button variant="outline" size="sm" onClick={importTopics} disabled={!csv.trim()}>Importar pauta</Button>
        </div>
      </div>
      <Field id={`rc-audio-${r.id}`} label="Link do áudio"><Input id={`rc-audio-${r.id}`} value={audio} onChange={(e) => setAudio(e.target.value)} placeholder="Drive, iCloud…" /></Field>
      <LinkOut href={audio}>Abrir áudio</LinkOut>
      <Field id={`rc-tr-${r.id}`} label="Transcrição"><Textarea id={`rc-tr-${r.id}`} rows={6} value={tr} onChange={(e) => setTr(e.target.value)} placeholder="Cole aqui a transcrição (iPhone, Whisper ou ElevenLabs)" /></Field>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={saveText}>Salvar</Button>
        <CopyPrompt variant="outline" text={() => promptMapa({ ...r, transcript: tr })} label="Pedido do mapa de cortes (Etapa 2)" />
        <Button size="sm" variant="ghost" className="ml-auto hover:text-destructive" onClick={() => window.confirm("Apagar esta gravação?") && remove.mutate(r.id)}><Trash2 className="size-4" />Apagar</Button>
      </div>
      {pieces.length > 0 && <p className="text-xs text-muted-foreground">Peças desta gravação: {pieces.map((c) => c.title).join(", ")}</p>}
    </div>
  );
}

export function RecordingsPanel() {
  const { data: recs = [] } = useRecordings();
  const { save, patch } = useCrmMutations("recordings");
  const [title, setTitle] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const add = () => save.mutate({ title: title.trim(), recorded_on: null, status: "pauta" }, { onSuccess: (id) => { setTitle(""); setOpen(id); } });
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) add(); }} className="flex max-w-lg gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nova sessão de gravação (ex.: Novembro #1)" aria-label="Nova gravação" />
        <Button type="submit" disabled={!title.trim()}><Plus className="size-4" />Gravação</Button>
      </form>
      {recs.length === 0 ? <Empty>Nenhuma gravação. Crie uma, cole a pauta que o Claude gerou e depois a transcrição.</Empty> : recs.map((r) => (
        <div key={r.id} className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-center gap-2 p-3">
            <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left font-medium" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}>
              <ChevronDown className={cn("size-4 transition-transform", open === r.id && "rotate-180")} />{r.title}
            </button>
            <Input type="date" className="h-8 w-36" value={r.recorded_on ?? ""} aria-label={`Data de ${r.title}`} onChange={(e) => patch.mutate({ id: r.id, values: { recorded_on: e.target.value || null } })} />
            <div className="w-40"><Choice id={`rc-st-${r.id}`} value={r.status} onChange={(v) => patch.mutate({ id: r.id, values: { status: v } })} options={REC_STATUS} /></div>
          </div>
          {open === r.id && <Detail r={r} />}
        </div>
      ))}
    </div>
  );
}
