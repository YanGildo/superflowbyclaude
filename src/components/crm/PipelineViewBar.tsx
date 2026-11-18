import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/common/RefSelect";
import { DATE_FILTERS, SORTS, TEMP_FILTERS, type ViewOpts } from "@/lib/pipelineView";

/** Ordem e filtros de dentro da campanha + exportar o que está na tela. */
export function PipelineViewBar({ view, setView, shown, total, onExport, source, setSource, sources }: {
  view: ViewOpts; setView: (v: ViewOpts) => void; shown: number; total: number; onExport: () => void;
  source: string; setSource: (s: string) => void; sources: { value: string; label: string }[];
}) {
  const filtered = view.temp !== "todas" || view.date !== "todas" || source !== "todas";
  const clear = () => { setView({ ...view, temp: "todas", date: "todas" }); setSource("todas"); };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2">
      <div className="w-56"><SimpleSelect id="view-sort" value={view.sort} onChange={(sort) => setView({ ...view, sort })} options={SORTS} /></div>
      <div className="w-52"><SimpleSelect id="view-temp" value={view.temp} onChange={(temp) => setView({ ...view, temp })} options={TEMP_FILTERS.map((t) => ({ ...t, label: t.value === "todas" ? "Todas as temperaturas" : t.label }))} /></div>
      <div className="w-44"><SimpleSelect id="view-date" value={view.date} onChange={(date) => setView({ ...view, date })} options={DATE_FILTERS} /></div>
      <div className="w-72"><SimpleSelect id="view-source" value={source} onChange={setSource} options={sources} /></div>
      {filtered && <Button size="sm" variant="ghost" onClick={clear}>Limpar filtros</Button>}
      <span className="text-xs text-muted-foreground" aria-live="polite">{filtered ? `${shown} de ${total} leads` : `${total} leads`}</span>
      <Button size="sm" variant="outline" className="ml-auto" onClick={onExport} disabled={shown === 0} title="Exporta todas as etapas, respeitando os filtros e a busca">
        <Download className="size-4" />Exportar CSV
      </Button>
    </div>
  );
}
