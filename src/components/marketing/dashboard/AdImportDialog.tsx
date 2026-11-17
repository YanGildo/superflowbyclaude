import { useEffect, useState } from "react";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/common/RefSelect";
import { useImportAds, type AdImportSummary } from "@/hooks/useAdMetrics";
import { AD_FIELDS, AD_PLATFORMS, autoMapAds, buildAdRows, detectLevel, LEVEL_LABEL, type AdField, type AdLevel } from "@/lib/adReports";
import { localISODate } from "@/lib/format";
import { readLeadFile, type ParsedFile } from "@/lib/leadImport";

const FIELD_OPTS = AD_FIELDS.map((f) => ({ value: f.value as AdField, label: f.label }));
const LEVEL_OPTS = (Object.keys(LEVEL_LABEL) as AdLevel[]).map((v) => ({ value: v, label: LEVEL_LABEL[v] }));
const PLATFORM_OPTS = AD_PLATFORMS.map((p) => ({ value: p, label: p }));

function Setup({ file, map, setMap, level, setLevel, platform, setPlatform, from, setFrom, to, setTo }: {
  file: ParsedFile; map: AdField[]; setMap: (m: AdField[]) => void; level: AdLevel; setLevel: (l: AdLevel) => void;
  platform: string; setPlatform: (p: string) => void; from: string; setFrom: (v: string) => void; to: string; setTo: (v: string) => void;
}) {
  const hasDates = map.includes("day") || map.includes("date_start");
  return (
    <div className="min-w-0 space-y-4">
      <p className="text-xs text-muted-foreground">{file.rows.length} linha(s) · {file.encoding} · separador {file.separator}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="ad-level">Nível do relatório</Label><SimpleSelect id="ad-level" value={level} onChange={setLevel} options={LEVEL_OPTS} /></div>
        <div className="space-y-1.5"><Label htmlFor="ad-platform">Plataforma</Label><SimpleSelect id="ad-platform" value={platform} onChange={setPlatform} options={PLATFORM_OPTS} /></div>
        {!hasDates && (
          <>
            <div className="space-y-1.5"><Label htmlFor="ad-from">Período: início</Label><Input id="ad-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label htmlFor="ad-to">Período: fim</Label><Input id="ad-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" /></div>
            <p className="text-[11px] text-muted-foreground sm:col-span-2">O arquivo não tem coluna de data. Informe o período do relatório (o mesmo que estava filtrado no Gerenciador).</p>
          </>
        )}
      </div>
      <div className="rounded-lg border">
        <div className="grid grid-cols-2 gap-2 border-b bg-muted/40 px-3 py-1.5 text-xs font-medium"><span>Coluna do arquivo</span><span>Vai para</span></div>
        <div className="max-h-60 divide-y overflow-y-auto">
          {file.headers.map((h, i) => (
            <div key={i} className="grid grid-cols-2 items-center gap-2 px-3 py-1.5">
              <p className="truncate text-sm" title={h}>{h || `(coluna ${i + 1})`} <span className="text-xs text-muted-foreground">· {file.rows[0]?.[i] ?? ""}</span></p>
              <SimpleSelect id={`admap-${i}`} value={map[i]} onChange={(v) => setMap(map.map((m, k) => (k === i ? v : m)))} options={FIELD_OPTS} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Summary({ s, skipped }: { s: AdImportSummary; skipped: number }) {
  return (
    <div className="space-y-3" aria-label="Resumo da importação de anúncios">
      <p className="flex items-center gap-2 font-medium text-success"><CheckCircle2 className="size-5" />Relatório importado</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[["novas", s.novos], ["atualizadas", s.atualizados], ["repetidas (ignoradas)", s.iguais + skipped]].map(([l, v]) => (
          <div key={l as string} className="rounded-lg border p-3"><p className="text-2xl font-semibold">{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{s.campanhas} campanha(s) atualizadas no dashboard. Linhas de total e sem campanha ficam de fora.</p>
      {s.erros.length > 0 && <ul className="max-h-32 overflow-y-auto text-xs text-destructive">{s.erros.map((e, i) => <li key={i}>Linha {e.line}: {e.erro}</li>)}</ul>}
    </div>
  );
}

function Picker({ onFile, error }: { onFile: (f: File) => void; error: string | null }) {
  return (
    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center hover:bg-accent/40">
      <FileUp className="size-8 text-primary" /><span className="text-sm font-medium">Escolha o arquivo .csv</span>
      <input type="file" accept=".csv,.tsv,text/csv" className="sr-only" aria-label="Arquivo do relatório" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {error && <span className="text-sm text-destructive">{error}</span>}
    </label>
  );
}

function Footer({ ready, done, pending, count, onRun, onClose }: { ready: boolean; done: boolean; pending: boolean; count: number; onRun: () => void; onClose: () => void }) {
  return (
    <DialogFooter>
      {ready
        ? <Button onClick={onRun} disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Importar {count} linha(s)</Button>
        : <Button variant={done ? "default" : "ghost"} onClick={onClose}>{done ? "Concluir" : "Cancelar"}</Button>}
    </DialogFooter>
  );
}

/** Importar relatório de anúncios (CSV) em 3 passos: arquivo, colunas/nível, resumo. */
export function AdImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const imp = useImportAds();
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [map, setMap] = useState<AdField[]>([]);
  const [level, setLevel] = useState<AdLevel>("campanha");
  const [platform, setPlatform] = useState("Meta Ads");
  const [from, setFrom] = useState(localISODate());
  const [to, setTo] = useState(localISODate());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ s: AdImportSummary; skipped: number } | null>(null);
  useEffect(() => { if (open) { setFile(null); setDone(null); setError(null); } }, [open]);

  const onFile = async (f: File) => {
    try {
      const parsed = readLeadFile(await f.arrayBuffer());
      if (!parsed.rows.length) return setError("O arquivo não tem linhas.");
      const m = autoMapAds(parsed.headers);
      setFile(parsed); setMap(m); setLevel(detectLevel(m)); setError(null);
    } catch { setError("Não consegui ler esse arquivo. Exporte como CSV."); }
  };
  const run = async () => {
    if (!file) return;
    if (!map.includes("campaign_name")) return setError("Indique a coluna com o nome da campanha.");
    const { rows, skipped } = buildAdRows(file, map, { platform, level, from, to });
    const s = await imp.mutateAsync({ rows });
    setDone({ s, skipped: skipped.length });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto overflow-x-hidden sm:max-w-3xl [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle className="font-heading">Importar relatório de anúncios (CSV)</DialogTitle>
          <DialogDescription>Gerenciador de Anúncios → Relatórios → Exportar → CSV. Pode ser por campanha, conjunto ou anúncio; com "Dia" na quebra fica por dia. Importar de novo não duplica.</DialogDescription>
        </DialogHeader>
        {!file && !done && <Picker onFile={(f) => void onFile(f)} error={error} />}
        {file && !done && <Setup {...{ file, map, setMap, level, setLevel, platform, setPlatform, from, setFrom, to, setTo }} />}
        {done && <Summary s={done.s} skipped={done.skipped} />}
        {file && !done && error && <p className="text-sm text-destructive">{error}</p>}
        <Footer ready={Boolean(file && !done)} done={Boolean(done)} pending={imp.isPending} count={file?.rows.length ?? 0} onRun={() => void run()} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
