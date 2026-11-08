import { useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, GripVertical, MoreHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccessDialog } from "@/components/team/AccessDialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCrmMutations } from "@/hooks/useCrm";
import type { Script, ScriptSegment } from "@/integrations/supabase/types";
import { fillVars, scriptVersions } from "@/lib/scripts";
import { cn } from "@/lib/utils";
import { ScriptText } from "./ScriptText";
import { VariationTabs } from "./ScriptVariations";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";

export interface ScriptActions { edit: (s: Script) => void; preview: (s: Script) => void }

/** Alça para arrastar o script (some quando a ordem não pode mudar, ex.: na busca). */
export interface DragHandle { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners }

function Grip({ drag, title }: { drag?: DragHandle; title: string }) {
  if (!drag) return null;
  return (
    <button type="button" {...drag.attributes} {...drag.listeners} aria-label={`Arrastar ${title}`}
      className="shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground/60 hover:text-foreground active:cursor-grabbing">
      <GripVertical className="size-4" />
    </button>
  );
}

function useScriptOps(s: Script, values: Record<string, string>, body = s.body) {
  const m = useCrmMutations("scripts");
  return {
    copy: async () => { await navigator.clipboard.writeText(fillVars(body, values)); toast.success("Script copiado."); },
    star: () => m.patch.mutate({ id: s.id, values: { favorite: !s.favorite } }),
    duplicate: () => m.save.mutate({ segment_id: s.segment_id, title: `${s.title} (cópia)`, category: s.category, moment: s.moment, channel: s.channel, body: s.body, tags: s.tags, body_label: s.body_label, variations: s.variations, position: s.position }),
    move: (segmentId: string) => m.patch.mutate({ id: s.id, values: { segment_id: segmentId } }),
    remove: () => m.patch.mutate({ id: s.id, values: { archived_at: new Date().toISOString() } }),
  };
}

function ScriptMenu({ s, segments, act, ops }: { s: Script; segments: ScriptSegment[]; act: ScriptActions; ops: ReturnType<typeof useScriptOps> }) {
  const [access, setAccess] = useState(false);
  return (
    <>
    <AccessDialog type="scripts" id={s.id} title={s.title} open={access} onOpenChange={setAccess} />
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-8" aria-label={`Mais ações para ${s.title}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => act.edit(s)}>Editar</DropdownMenuItem>
        <DropdownMenuItem onClick={ops.duplicate}>Duplicar</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setAccess(true)}>Acesso e equipe…</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Mover para</DropdownMenuLabel>
        {segments.filter((g) => g.id !== s.segment_id).map((g) => <DropdownMenuItem key={g.id} onClick={() => ops.move(g.id)}>{g.name}</DropdownMenuItem>)}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={ops.remove}>Excluir</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}

function StarButton({ s, onClick }: { s: Script; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={s.favorite} aria-label={s.favorite ? `Tirar ${s.title} dos favoritos` : `Favoritar ${s.title}`}
      className={cn("shrink-0 rounded p-1", s.favorite ? "text-warning" : "text-muted-foreground/50 hover:text-warning")}>
      <Star className={cn("size-4", s.favorite && "fill-current")} />
    </button>
  );
}

/** Script em card: título, categoria, momento, texto rolável, tags e ações. */
interface ItemProps { s: Script; segments: ScriptSegment[]; values: Record<string, string>; act: ScriptActions; drag?: DragHandle }

export function ScriptCard({ s, segments, values, act, drag }: ItemProps) {
  const versions = scriptVersions(s);
  const [v, setV] = useState(0);
  const cur = versions[Math.min(v, versions.length - 1)];
  const ops = useScriptOps(s, values, cur.body);
  return (
    <article className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4">
      <header className="flex items-start justify-between gap-2">
        <Grip drag={drag} title={s.title} />
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-semibold leading-snug">{s.title}</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            {s.category && <Badge variant="secondary" className="text-[10px]">{s.category}</Badge>}
            <Badge variant="outline" className="text-[10px]">{s.channel}</Badge>
          </div>
        </div>
        <StarButton s={s} onClick={ops.star} />
      </header>
      {s.moment && <p className="text-xs italic text-muted-foreground">{s.moment}</p>}
      <VariationTabs labels={versions.map((x) => x.label)} active={v} onChange={setV} title={s.title} />
      <div className="max-h-36 flex-1 overflow-y-auto rounded-lg bg-muted/50 p-3"><ScriptText body={cur.body} /></div>
      {s.tags.length > 0 && <div className="flex flex-wrap gap-1">{s.tags.map((t) => <span key={t} className="text-[11px] text-primary">#{t}</span>)}</div>}
      <div className="flex items-center gap-1">
        <Button className="flex-1" onClick={ops.copy}><Copy className="size-4" />Copiar</Button>
        <Button size="icon" variant="ghost" aria-label={`Ver ${s.title} com variáveis`} onClick={() => act.preview({ ...s, body: cur.body })}><Eye className="size-4" /></Button>
        <ScriptMenu s={s} segments={segments} act={act} ops={ops} />
      </div>
    </article>
  );
}

/** Script em linha (visão compacta). */
export function ScriptLine({ s, segments, values, act, drag }: ItemProps) {
  const ops = useScriptOps(s, values);
  const extra = (s.variations ?? []).filter((x) => x.body?.trim()).length;
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
      <Grip drag={drag} title={s.title} />
      <StarButton s={s} onClick={ops.star} />
      <button type="button" onClick={() => act.preview(s)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{s.title}{extra > 0 && <span className="ml-1.5 text-xs font-normal text-primary">+{extra} variação(ões)</span>}</p>
        <p className="truncate text-xs text-muted-foreground">{s.category ?? "Sem categoria"} · {s.body.replace(/\n+/g, " ").slice(0, 120)}</p>
      </button>
      <Button size="sm" onClick={ops.copy}><Copy className="size-4" />Copiar</Button>
      <ScriptMenu s={s} segments={segments} act={act} ops={ops} />
    </div>
  );
}
