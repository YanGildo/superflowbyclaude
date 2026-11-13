import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCampaigns, type ImportSummary } from "@/hooks/useCampaigns";
import type { Pipeline, PipelineStage } from "@/integrations/supabase/types";
import { autoMap, buildRows, readLeadFile, rulesOf, type Field, type ParsedFile } from "@/lib/leadImport";
import { FileStep, MappingStep, SummaryStep } from "./ImportSteps";

const DEFAULT_SOURCE = "Meta · Formulário instantâneo · {form_name}";
const STEPS = ["Arquivo", "Mapeamento", "Importar"];

function Footer({ step, done, pending, progress, total, onBack, onRun, onClose }: {
  step: number; done: boolean; pending: boolean; progress: number; total: number; onBack: () => void; onRun: () => void; onClose: () => void;
}) {
  if (step !== 1) return <DialogFooter><Button type="button" variant={done ? "default" : "ghost"} onClick={onClose}>{done ? "Concluir" : "Cancelar"}</Button></DialogFooter>;
  return (
    <DialogFooter>
      <Button type="button" variant="ghost" onClick={onBack}>Trocar arquivo</Button>
      <Button type="button" onClick={onRun} disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}{pending ? `Importando ${progress}/${total}` : `Importar ${total} lead(s)`}
      </Button>
    </DialogFooter>
  );
}

/** Importar leads de CSV/TSV para uma campanha em 3 passos. */
export function ImportLeadsDialog({ open, onOpenChange, pipeline, stages }: {
  open: boolean; onOpenChange: (o: boolean) => void; pipeline: Pipeline; stages: PipelineStage[];
}) {
  const { importLeads } = useCampaigns();
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [map, setMap] = useState<Field[]>([]);
  const [stageId, setStageId] = useState<string | null>(null);
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ s: ImportSummary; skipped: number } | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) return;
    setFile(null); setMap([]); setStageId(stages[0]?.id ?? null); setSource(DEFAULT_SOURCE); setError(null); setDone(null); setProgress(0);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFile = async (f: File) => {
    setError(null);
    try {
      const parsed = readLeadFile(await f.arrayBuffer());
      if (!parsed.headers.length || !parsed.rows.length) return setError("O arquivo não tem cabeçalho e linhas.");
      setFile(parsed); setMap(autoMap(parsed.headers));
    } catch {
      setError("Não consegui ler esse arquivo.");
    }
  };

  const run = async () => {
    if (!file || !stageId) return setError("Escolha a etapa de entrada.");
    if (!map.some((m) => ["name", "first_name", "phone", "email"].includes(m))) return setError("Mapeie pelo menos nome, telefone ou e-mail.");
    setError(null);
    const { rows, skipped } = buildRows(file, map, source, rulesOf(pipeline));
    const s = await importLeads.mutateAsync({ pipelineId: pipeline.id, stageId, rows, onProgress: setProgress });
    setDone({ s, skipped: skipped.length });
  };

  const step = done ? 2 : file ? 1 : 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto overflow-x-hidden sm:max-w-3xl [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle className="font-heading">Importar leads (CSV) · {pipeline.name}</DialogTitle>
          <DialogDescription>
            {STEPS.map((s, i) => <span key={s} className={i === step ? "font-semibold text-foreground" : ""}>{i + 1}. {s}{i < 2 ? "  ›  " : ""}</span>)}
          </DialogDescription>
        </DialogHeader>
        {step === 0 && <FileStep onFile={(f) => void onFile(f)} error={error} />}
        {step === 1 && file && (
          <MappingStep file={file} map={map} setMap={setMap} stages={stages} stageId={stageId} setStageId={setStageId} source={source} setSource={setSource} />
        )}
        {done && <SummaryStep s={done.s} skipped={done.skipped} />}
        {step === 1 && error && <p className="text-sm text-destructive">{error}</p>}
        <Footer step={step} done={Boolean(done)} pending={importLeads.isPending} progress={progress} total={file?.rows.length ?? 0}
          onBack={() => setFile(null)} onRun={() => void run()} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
