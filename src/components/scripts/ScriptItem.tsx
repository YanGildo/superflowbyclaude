import { toast } from "sonner";
import { Copy, Eye, MoreHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCrmMutations } from "@/hooks/useCrm";
import type { Script, ScriptSegment } from "@/integrations/supabase/types";
import { fillVars } from "@/lib/scripts";
import { cn } from "@/lib/utils";
import { ScriptText } from "./ScriptText";

export interface ScriptActions { edit: (s: Script) => void; preview: (s: Script) => void }

function useScriptOps(s: Script, values: Record<string, string>) {
  const m = useCrmMutations("scripts");
  return {
    copy: async () => { await navigator.clipboard.writeText(fillVars(s.body, values)); toast.success("Script copiado."); },
    star: () => m.patch.mutate({ id: s.id, values: { favorite: !s.favorite } }),
    duplicate: () => m.save.mutate({ segment_id: s.segment_id, title: `${s.title} (cópia)`, category: s.category, moment: s.moment, channel: s.channel, body: s.body, tags: s.tags }),
    move: (segmentId: string) => m.patch.mutate({ id: s.id, values: { segment_id: segmentId } }),
    remove: () => m.patch.mutate({ id: s.id, values: { archived_at: new Date().toISOString() } }),
  };
}

function ScriptMenu({ s, segments, act, ops }: { s: Script; segments: ScriptSegment[]; act: ScriptActions; ops: ReturnType<typeof useScriptOps> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-8" aria-label={`Mais ações para ${s.title}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => act.edit(s)}>Editar</DropdownMenuItem>
        <DropdownMenuItem onClick={ops.duplicate}>Duplicar</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Mover para</DropdownMenuLabel>
        {segments.filter((g) => g.id !== s.segment_id).map((g) => <DropdownMenuItem key={g.id} onClick={() => ops.move(g.id)}>{g.name}</DropdownMenuItem>)}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={ops.remove}>Excluir</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
export function ScriptCard({ s, segments, values, act }: { s: Script; segments: ScriptSegment[]; values: Record<string, string>; act: ScriptActions }) {
  const ops = useScriptOps(s, values);
  return (
    <article className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-heading font-semibold leading-snug">{s.title}</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            {s.category && <Badge variant="secondary" className="text-[10px]">{s.category}</Badge>}
            <Badge variant="outline" className="text-[10px]">{s.channel}</Badge>
          </div>
        </div>
        <StarButton s={s} onClick={ops.star} />
      </header>
      {s.moment && <p className="text-xs italic text-muted-foreground">{s.moment}</p>}
      <div className="max-h-36 flex-1 overflow-y-auto rounded-lg bg-muted/50 p-3"><ScriptText body={s.body} /></div>
      {s.tags.length > 0 && <div className="flex flex-wrap gap-1">{s.tags.map((t) => <span key={t} className="text-[11px] text-primary">#{t}</span>)}</div>}
      <div className="flex items-center gap-1">
        <Button className="flex-1" onClick={ops.copy}><Copy className="size-4" />Copiar</Button>
        <Button size="icon" variant="ghost" aria-label={`Ver ${s.title} com variáveis`} onClick={() => act.preview(s)}><Eye className="size-4" /></Button>
        <ScriptMenu s={s} segments={segments} act={act} ops={ops} />
      </div>
    </article>
  );
}

/** Script em linha (visão compacta). */
export function ScriptLine({ s, segments, values, act }: { s: Script; segments: ScriptSegment[]; values: Record<string, string>; act: ScriptActions }) {
  const ops = useScriptOps(s, values);
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
      <StarButton s={s} onClick={ops.star} />
      <button type="button" onClick={() => act.preview(s)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{s.title}</p>
        <p className="truncate text-xs text-muted-foreground">{s.category ?? "Sem categoria"} · {s.body.replace(/\n+/g, " ").slice(0, 120)}</p>
      </button>
      <Button size="sm" onClick={ops.copy}><Copy className="size-4" />Copiar</Button>
      <ScriptMenu s={s} segments={segments} act={act} ops={ops} />
    </div>
  );
}
