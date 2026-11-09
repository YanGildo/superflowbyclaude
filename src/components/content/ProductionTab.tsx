import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCrmMutations } from "@/hooks/useCrm";
import { useContentItems } from "@/hooks/useMarketing";
import type { ContentItem, ContentStage } from "@/integrations/supabase/types";
import { FLOW, checklistDone, needsChecklist } from "@/lib/content";
import { CONTENT_STAGE } from "@/lib/marketing";
import { cn } from "@/lib/utils";
import { ItemSheet } from "./ItemSheet";

function Card({ c, onOpen, onMove }: { c: ContentItem; onOpen: () => void; onMove: (dir: -1 | 1) => void }) {
  const i = FLOW.indexOf(c.stage);
  return (
    <div className="group space-y-1.5 rounded-lg border bg-card p-2.5 shadow-sm">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <p className="line-clamp-2 text-sm font-medium">{c.title}</p>
        {c.hook && <p className="mt-0.5 line-clamp-2 text-xs italic text-muted-foreground">“{c.hook}”</p>}
      </button>
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5">{c.kind}</span>
        {c.channel && <span className="truncate">{c.channel}</span>}
        {c.publish_at && <span className="ml-auto shrink-0">{new Date(c.publish_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>}
      </div>
      <div className="flex justify-between opacity-60 group-hover:opacity-100">
        <Button size="icon" variant="ghost" className="size-6" disabled={i <= 0} onClick={() => onMove(-1)} aria-label={`Voltar ${c.title} de etapa`}><ChevronLeft className="size-3.5" /></Button>
        <Button size="icon" variant="ghost" className="size-6" disabled={i >= FLOW.length - 1} onClick={() => onMove(1)} aria-label={`Avançar ${c.title} de etapa`}><ChevronRight className="size-3.5" /></Button>
      </div>
    </div>
  );
}

/** Kanban das peças: Ideia → Roteiro → Gravação → Edição → Aprovado → Agendado → Publicado. */
export function ProductionTab() {
  const { data: items = [] } = useContentItems();
  const { save, patch } = useCrmMutations("content_items");
  const [open, setOpen] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const list = items.filter((c) => FLOW.includes(c.stage));
  const current = items.find((c) => c.id === open) ?? null;

  const move = (c: ContentItem, dir: -1 | 1) => {
    const next = FLOW[FLOW.indexOf(c.stage) + dir] as ContentStage;
    if (needsChecklist(next) && !checklistDone(c)) { toast.error("Antes de aprovar, marque o checklist da peça."); setOpen(c.id); return; }
    patch.mutate({ id: c.id, values: { stage: next } });
  };
  const add = () => { if (title.trim()) save.mutate({ title: title.trim(), kind: "Reels", channel: "Instagram", stage: "ideia" }, { onSuccess: () => setTitle("") }); };

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex max-w-lg gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nova ideia de peça…" aria-label="Nova ideia de peça" />
        <Button type="submit" disabled={!title.trim()}><Plus className="size-4" />Ideia</Button>
      </form>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {FLOW.map((s) => {
          const col = list.filter((c) => c.stage === s);
          return (
            <section key={s} className="w-60 shrink-0 space-y-2 rounded-xl bg-muted/40 p-2" aria-label={CONTENT_STAGE[s].label}>
              <p className={cn("flex items-center justify-between rounded-md px-2 py-1 text-xs font-semibold", CONTENT_STAGE[s].tone)}>{CONTENT_STAGE[s].label}<span>{col.length}</span></p>
              {col.map((c) => <Card key={c.id} c={c} onOpen={() => setOpen(c.id)} onMove={(d) => move(c, d)} />)}
            </section>
          );
        })}
      </div>
      <ItemSheet item={current} onClose={() => setOpen(null)} />
    </div>
  );
}
