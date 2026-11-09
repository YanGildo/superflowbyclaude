import { useRef, useState } from "react";
import { AlertTriangle, CalendarDays, List, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MonthCalendar } from "@/components/marketing/MonthCalendar";
import { useCrmMutations } from "@/hooks/useCrm";
import { useContentItems } from "@/hooks/useMarketing";
import type { ContentItem } from "@/integrations/supabase/types";
import { CSV_COLUMNS, SOCIAL, calendarAlerts, csvToItem, parseCalendarCsv, promptCalendario, type CsvRow } from "@/lib/content";
import { localISODate } from "@/lib/format";
import { CONTENT_STAGE } from "@/lib/marketing";
import { cn } from "@/lib/utils";
import { Choice, CopyPrompt, Empty } from "./ContentBits";
import { ItemSheet } from "./ItemSheet";

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const localDay = (iso: string) => localISODate(new Date(iso));

function ImportDialog({ rows, onClose }: { rows: CsvRow[] | null; onClose: () => void }) {
  const { save } = useCrmMutations("content_items");
  const [busy, setBusy] = useState(false);
  const good = (rows ?? []).filter((r) => !r.errors.length);
  const run = async () => {
    setBusy(true);
    for (const r of good) await save.mutateAsync(csvToItem(r.values)).catch(() => undefined);
    setBusy(false); toast.success(`${good.length} peça(s) no calendário.`); onClose();
  };
  return (
    <Dialog open={Boolean(rows)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Prévia do CSV</DialogTitle>
          <DialogDescription>{good.length} linha(s) boas, {(rows?.length ?? 0) - good.length} com erro (ficam de fora).</DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="p-1.5">Linha</th>{["data", "hora", "plataforma", "formato", "titulo", "gancho"].map((h) => <th key={h} className="p-1.5">{h}</th>)}<th className="p-1.5">Situação</th></tr></thead>
            <tbody>{(rows ?? []).map((r) => (
              <tr key={r.line} className={cn("border-b", r.errors.length && "bg-destructive/5")}>
                <td className="p-1.5">{r.line}</td>
                {["data", "hora", "plataforma", "formato", "titulo", "gancho"].map((h) => <td key={h} className="max-w-[180px] truncate p-1.5">{r.values[h]}</td>)}
                <td className="p-1.5">{r.errors.length ? <span className="text-destructive">{r.errors.join("; ")}</span> : "ok"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={run} disabled={!good.length || busy}>Importar {good.length}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ListView({ list, onOpen }: { list: ContentItem[]; onOpen: (id: string) => void }) {
  if (!list.length) return <Empty>Nada no calendário. Importe o CSV que o Claude gera na Etapa 4.</Empty>;
  return (
    <div className="divide-y rounded-lg border bg-card">
      {list.map((c) => (
        <button key={c.id} type="button" onClick={() => onOpen(c.id)} className="flex w-full flex-wrap items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent/40">
          <span className="w-28 shrink-0 text-xs text-muted-foreground">{new Date(c.publish_at as string).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px]">{c.channel} · {c.kind}</span>
          <span className="min-w-0 flex-1 truncate font-medium">{c.hook || c.title}</span>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px]", CONTENT_STAGE[c.stage].tone)}>{CONTENT_STAGE[c.stage].label}</span>
        </button>
      ))}
    </div>
  );
}

/** Grade do mês (ou lista) das peças com data, importação do CSV e as conferências do Kit. */
export function CalendarTab() {
  const { data: items = [] } = useContentItems();
  const [view, setView] = useState<"mes" | "lista">("mes");
  const [platform, setPlatform] = useState("todas");
  const [open, setOpen] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvRow[] | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const dated = items.filter((c) => c.publish_at && c.stage !== "pausado" && (platform === "todas" || c.channel === platform))
    .sort((a, b) => (a.publish_at as string).localeCompare(b.publish_at as string));
  const alerts = calendarAlerts(dated);
  const events = dated.map((c) => ({ id: c.id, date: localDay(c.publish_at as string), title: `${hhmm(c.publish_at as string)} ${c.kind} · ${c.hook || c.title}`, color: CONTENT_STAGE[c.stage].color, kind: c.kind, onOpen: () => setOpen(c.id) }));
  const onFile = async (f?: File) => { if (f) setRows(parseCalendarCsv(await f.text())); if (file.current) file.current.value = ""; };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border bg-card p-0.5">
          <Button size="sm" variant={view === "mes" ? "default" : "ghost"} onClick={() => setView("mes")}><CalendarDays className="size-4" />Mês</Button>
          <Button size="sm" variant={view === "lista" ? "default" : "ghost"} onClick={() => setView("lista")}><List className="size-4" />Lista</Button>
        </div>
        <div className="w-40"><Choice id="cal-platform" value={platform} onChange={setPlatform} options={[{ value: "todas", label: "Todas as plataformas" }, ...SOCIAL.map((s) => ({ value: s, label: s }))]} /></div>
        <div className="ml-auto flex flex-wrap gap-2">
          <CopyPrompt variant="outline" text={promptCalendario()} label="Pedido do calendário (Etapa 4)" />
          <input ref={file} type="file" accept=".csv,text/csv" className="hidden" aria-label="Arquivo CSV do calendário" onChange={(e) => void onFile(e.target.files?.[0])} />
          <Button size="sm" onClick={() => file.current?.click()}><Upload className="size-4" />Importar CSV</Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">CSV com as colunas: <code>{CSV_COLUMNS.join(",")}</code> (data AAAA-MM-DD).</p>
      {alerts.length > 0 && (
        <div className="space-y-1 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm" aria-label="Alertas do calendário">
          {alerts.map((a) => <p key={a} className="flex gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />{a}</p>)}
        </div>
      )}
      {view === "mes" ? <MonthCalendar events={events} /> : <ListView list={dated} onOpen={setOpen} />}
      <ImportDialog rows={rows} onClose={() => setRows(null)} />
      <ItemSheet item={items.find((c) => c.id === open) ?? null} onClose={() => setOpen(null)} />
    </div>
  );
}
