import { useEffect, useMemo, useState } from "react";
import { BookOpen, Download, MessageSquareText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { ScriptCard, ScriptLine, type ScriptActions } from "@/components/scripts/ScriptItem";
import { ScriptDialog } from "@/components/scripts/ScriptDialog";
import { ScriptPreviewDialog } from "@/components/scripts/ScriptPreviewDialog";
import { SegmentsDialog } from "@/components/scripts/SegmentsDialog";
import { VariablesDialog } from "@/components/scripts/VariablesDialog";
import { CategoryChips, SearchRow, SegmentBar, ViewToggle, type ScriptView } from "@/components/scripts/ScriptsToolbar";
import { useBulkInsertScripts, useScriptSegments, useScripts } from "@/hooks/useCrm";
import type { Script } from "@/integrations/supabase/types";
import { libraryFor } from "@/data/scripts";
import { matchesScript } from "@/lib/scripts";

type Dlg = { kind: "script"; script: Script | null } | { kind: "segments"; startNew: boolean } | { kind: "vars" } | null;

function countByCategory(list: Script[]) {
  const m = new Map<string, number>([["favoritos", list.filter((s) => s.favorite).length]]);
  list.forEach((s) => s.category && m.set(s.category, (m.get(s.category) ?? 0) + 1));
  return m;
}

/** Banner para carregar os scripts prontos quando o segmento está vazio. */
function LibraryBanner({ segmentId, segmentName }: { segmentId: string; segmentName: string }) {
  const lib = libraryFor(segmentName);
  const bulk = useBulkInsertScripts();
  if (lib.length === 0) return null;
  const load = () => bulk.mutate(lib.map((s) => ({ segment_id: segmentId, title: s.title, category: s.category, moment: s.moment, body: s.body, tags: s.tags, favorite: Boolean(s.favorite), channel: s.channel ?? "WhatsApp" })));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="flex items-center gap-2 text-sm"><BookOpen className="size-4 text-primary" />Este segmento tem <b>{lib.length} scripts prontos</b> (revisados do Superflow antigo e novos).</p>
      <Button size="sm" onClick={load} disabled={bulk.isPending}><Download className="size-4" />Carregar scripts prontos</Button>
    </div>
  );
}

/** Segmento atual (o padrão quando nenhum foi escolhido), busca e filtro de categoria. */
function useScriptsState() {
  const { data: allSegments = [] } = useScriptSegments();
  const { data: scripts = [], isLoading } = useScripts();
  const segments = useMemo(() => allSegments.filter((s) => !s.archived_at), [allSegments]);
  const [segmentId, setSegmentId] = useState("");
  const [q, setQ] = useState("");
  const [everywhere, setEverywhere] = useState(false);
  const [cat, setCat] = useState("todos");

  // Escolhe o padrão no começo e quando o segmento atual é arquivado. Um id ainda desconhecido
  // (segmento recém-criado, antes de recarregar a lista) é mantido.
  useEffect(() => {
    const archived = allSegments.some((s) => s.id === segmentId && s.archived_at);
    if ((!segmentId || archived) && segments.length) setSegmentId((segments.find((s) => s.is_default) ?? segments[0]).id);
  }, [allSegments, segments, segmentId]);
  useEffect(() => setCat("todos"), [segmentId]);

  const segment = segments.find((s) => s.id === segmentId) ?? null;
  const inSegment = useMemo(() => scripts.filter((s) => s.segment_id === segmentId), [scripts, segmentId]);
  const pool = everywhere && q ? scripts : inSegment;
  const byCat = (s: Script) => cat === "todos" || (cat === "favoritos" ? s.favorite : s.category === cat);
  const list = pool.filter((s) => matchesScript(s, q) && byCat(s));
  return { segments, segment, segmentId, setSegmentId, inSegment, list, isLoading, q, setQ, everywhere, setEverywhere, cat, setCat };
}

function ScriptsList({ list, empty, view, act, st, onNew }: {
  list: Script[]; empty: boolean; view: ScriptView; act: ScriptActions; st: ReturnType<typeof useScriptsState>; onNew: () => void;
}) {
  if (st.isLoading) return <Skeleton className="h-60 rounded-xl" />;
  if (list.length === 0) {
    return (
      <EmptyState icon={MessageSquareText} title={empty ? "Nenhum script neste segmento" : "Nenhum script com esse filtro"}
        action={<Button onClick={onNew}><Plus className="size-4" />Novo script</Button>} />
    );
  }
  const Item = view === "cards" ? ScriptCard : ScriptLine;
  return (
    <div className={view === "cards" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "space-y-1.5"}>
      {list.map((s) => <Item key={s.id} s={s} segments={st.segments} values={st.segment?.variables ?? {}} act={act} />)}
    </div>
  );
}

function ScriptsDialogs({ dlg, setDlg, preview, setPreview, st }: {
  dlg: Dlg; setDlg: (d: Dlg) => void; preview: Script | null; setPreview: (s: Script | null) => void; st: ReturnType<typeof useScriptsState>;
}) {
  const close = (o: boolean) => { if (!o) setDlg(null); };
  return (
    <>
      <ScriptDialog open={dlg?.kind === "script"} onOpenChange={close} script={dlg?.kind === "script" ? dlg.script : null} segments={st.segments} segmentId={st.segmentId || null} />
      <SegmentsDialog open={dlg?.kind === "segments"} onOpenChange={close} segments={st.segments} startNew={dlg?.kind === "segments" && dlg.startNew} onSelect={st.setSegmentId} />
      <VariablesDialog open={dlg?.kind === "vars"} onOpenChange={close} segment={st.segment} scripts={st.inSegment} />
      <ScriptPreviewDialog script={preview} defaults={st.segment?.variables ?? {}} onClose={() => setPreview(null)} />
    </>
  );
}

export default function Scripts() {
  const st = useScriptsState();
  const [view, setView] = useState<ScriptView>("cards");
  const [dlg, setDlg] = useState<Dlg>(null);
  const [preview, setPreview] = useState<Script | null>(null);
  const act: ScriptActions = { edit: (s) => setDlg({ kind: "script", script: s }), preview: setPreview };
  const newScript = () => setDlg({ kind: "script", script: null });
  const showLibrary = Boolean(st.segment) && st.inSegment.length === 0 && !st.isLoading;

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="CRM Agência" title="Scripts" description="Mensagens prontas para atendimento e vendas, por segmento."
        actions={<><ViewToggle view={view} setView={setView} /><Button onClick={newScript}><Plus className="size-4" />Novo script</Button></>} />
      <SegmentBar segments={st.segments} segmentId={st.segmentId} setSegmentId={st.setSegmentId}
        onNew={() => setDlg({ kind: "segments", startNew: true })} onManage={() => setDlg({ kind: "segments", startNew: false })} onVars={() => setDlg({ kind: "vars" })} />
      {st.segment?.description && <p className="max-w-3xl text-xs text-muted-foreground">{st.segment.description}</p>}
      <SearchRow q={st.q} setQ={st.setQ} everywhere={st.everywhere} setEverywhere={st.setEverywhere} />
      <CategoryChips categories={st.segment?.categories ?? []} counts={countByCategory(st.inSegment)} value={st.cat} setValue={st.setCat} />
      {showLibrary && st.segment && <LibraryBanner segmentId={st.segment.id} segmentName={st.segment.name} />}
      <ScriptsList list={st.list} empty={st.inSegment.length === 0} view={view} act={act} st={st} onNew={newScript} />
      <ScriptsDialogs dlg={dlg} setDlg={setDlg} preview={preview} setPreview={setPreview} st={st} />
    </div>
  );
}
