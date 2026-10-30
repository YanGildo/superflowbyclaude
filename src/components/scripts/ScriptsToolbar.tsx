import { LayoutGrid, List, Plus, Search, Settings2, SlidersHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ScriptSegment } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

export type ScriptView = "cards" | "linhas";

export function ViewToggle({ view, setView }: { view: ScriptView; setView: (v: ScriptView) => void }) {
  const btn = (v: ScriptView, Icon: typeof List, label: string) => (
    <button type="button" aria-pressed={view === v} onClick={() => setView(v)}
      className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium", view === v ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
      <Icon className="size-3.5" />{label}
    </button>
  );
  return <div className="flex gap-0.5 rounded-lg border bg-card p-0.5">{btn("cards", LayoutGrid, "Cards")}{btn("linhas", List, "Linhas")}</div>;
}

export function SegmentBar({ segments, segmentId, setSegmentId, onNew, onManage, onVars }: {
  segments: ScriptSegment[]; segmentId: string; setSegmentId: (id: string) => void; onNew: () => void; onManage: () => void; onVars: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Segmento:</span>
      <Select value={segmentId} onValueChange={setSegmentId}>
        <SelectTrigger className="h-9 w-64" aria-label="Segmento"><SelectValue placeholder="Escolha o segmento" /></SelectTrigger>
        <SelectContent>
          {segments.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}{s.is_default ? " ★" : ""}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" onClick={onNew}><Plus className="size-4" />Novo segmento</Button>
      <Button size="sm" variant="outline" onClick={onManage}><Settings2 className="size-4" />Gerenciar segmentos</Button>
      <Button size="sm" variant="outline" onClick={onVars}><SlidersHorizontal className="size-4" />Configurar variáveis</Button>
    </div>
  );
}

export function SearchRow({ q, setQ, everywhere, setEverywhere }: { q: string; setQ: (v: string) => void; everywhere: boolean; setEverywhere: (v: boolean) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[240px] flex-1 sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título, texto, momento ou tag…" aria-label="Buscar script" className="h-9 pl-9" />
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={everywhere} onChange={(e) => setEverywhere(e.target.checked)} className="size-3.5 accent-[hsl(var(--primary))]" />
        Buscar em todos os segmentos
      </label>
    </div>
  );
}

export function CategoryChips({ categories, counts, value, setValue }: {
  categories: string[]; counts: Map<string, number>; value: string; setValue: (v: string) => void;
}) {
  const chip = (id: string, label: React.ReactNode) => (
    <button key={id} type="button" aria-pressed={value === id} onClick={() => setValue(id)}
      className={cn("rounded-full border px-3 py-1 text-xs transition-colors", value === id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}>
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap gap-1.5">
      {chip("todos", "Todos")}
      {chip("favoritos", <span className="inline-flex items-center gap-1"><Star className="size-3" />Favoritos ({counts.get("favoritos") ?? 0})</span>)}
      {categories.map((c) => chip(c, `${c}${counts.get(c) ? ` (${counts.get(c)})` : ""}`))}
    </div>
  );
}
