import { AlertTriangle, CheckCircle2, FileUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import type { ImportSummary } from "@/hooks/useCampaigns";
import type { PipelineStage } from "@/integrations/supabase/types";
import { FIELDS, prettyQuestion, type Field, type ParsedFile } from "@/lib/leadImport";

const FIELD_OPTIONS = FIELDS.map((f) => ({ value: f.value as Field, label: f.label }));

export function FileStep({ onFile, error }: { onFile: (f: File) => void; error: string | null }) {
  return (
    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center hover:bg-accent/40">
      <FileUp className="size-8 text-primary" />
      <span className="text-sm font-medium">Escolha o arquivo .csv ou .tsv</span>
      <span className="text-xs text-muted-foreground">Funciona com o CSV da Central de Leads do Meta (UTF-16 com TAB) e com planilhas comuns. A codificação e o separador são detectados sozinhos.</span>
      <input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" className="sr-only" aria-label="Arquivo de leads"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {error && <span className="text-sm text-destructive">{error}</span>}
    </label>
  );
}

export function MappingStep({ file, map, setMap, stages, stageId, setStageId, source, setSource }: {
  file: ParsedFile; map: Field[]; setMap: (m: Field[]) => void; stages: PipelineStage[];
  stageId: string | null; setStageId: (v: string | null) => void; source: string; setSource: (v: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-4">
      <p className="text-xs text-muted-foreground">{file.rows.length} linha(s) · {file.encoding} · separador {file.separator}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="imp-stage">Etapa de entrada</Label>
          <RefSelect id="imp-stage" value={stageId} onChange={setStageId} options={stages} placeholder="Escolha a etapa" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="imp-source">Origem</Label>
          <Input id="imp-source" value={source} onChange={(e) => setSource(e.target.value)} className="h-9" />
          <p className="text-[11px] text-muted-foreground">{"{form_name}"} vira o nome do formulário de cada lead.</p>
        </div>
      </div>
      <div className="rounded-lg border">
        <div className="grid grid-cols-2 gap-2 border-b bg-muted/40 px-3 py-1.5 text-xs font-medium"><span>Coluna do arquivo</span><span>Vai para</span></div>
        <div className="max-h-64 divide-y overflow-y-auto">
          {file.headers.map((h, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr] items-center gap-2 px-3 py-1.5">
              <div className="min-w-0">
                <p className="truncate text-sm" title={h}>{h || `(coluna ${i + 1})`}</p>
                {map[i] === "answer" && <p className="truncate text-[11px] text-muted-foreground">Pergunta: {prettyQuestion(h)}</p>}
              </div>
              <SimpleSelect id={`map-${i}`} value={map[i]} onChange={(v) => setMap(map.map((m, k) => (k === i ? v : m)))} options={FIELD_OPTIONS} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium">Prévia (5 primeiras linhas)</p>
        <div className="max-w-full overflow-x-auto rounded-lg border">
          <table className="w-full text-xs" aria-label="Prévia do arquivo">
            <thead className="bg-muted/40"><tr>{file.headers.map((h, i) => <th key={i} className="whitespace-nowrap px-2 py-1 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {file.rows.slice(0, 5).map((r, i) => <tr key={i}>{file.headers.map((_, j) => <td key={j} className="max-w-48 truncate whitespace-nowrap px-2 py-1">{r[j]}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function SummaryStep({ s, skipped }: { s: ImportSummary; skipped: number }) {
  const ignored = s.ignorados + skipped;
  return (
    <div className="space-y-3" aria-label="Resumo da importação">
      <div className="flex items-center gap-2 text-success"><CheckCircle2 className="size-5" /><span className="font-medium">Importação concluída</span></div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border p-3"><p className="text-2xl font-semibold">{s.novos}</p><p className="text-xs text-muted-foreground">novos</p></div>
        <div className="rounded-lg border p-3"><p className="text-2xl font-semibold">{s.atualizados}</p><p className="text-xs text-muted-foreground">atualizados</p></div>
        <div className="rounded-lg border p-3"><p className="text-2xl font-semibold">{ignored}</p><p className="text-xs text-muted-foreground">ignorados</p></div>
      </div>
      <p className="text-xs text-muted-foreground">{s.cards} card(s) novo(s) na campanha. Ignorados = sem nome e sem telefone/e-mail. Quem já tinha card aberto aqui não foi duplicado.</p>
      {s.erros.length > 0 && (
        <div className="rounded-lg border border-destructive/40 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-destructive"><AlertTriangle className="size-4" />{s.erros.length} erro(s)</p>
          <ul className="max-h-40 space-y-0.5 overflow-y-auto text-xs">{s.erros.map((e, i) => <li key={i}>Linha {e.line}: {e.erro}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
