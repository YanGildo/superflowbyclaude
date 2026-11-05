import { useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Markdown } from "@/components/plans/Markdown";
import type { ActionPlanAsset } from "@/integrations/supabase/types";
import { ASSET_KIND } from "@/lib/actionPlans";
import { cn } from "@/lib/utils";

function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    setDone(true); toast.success("Copiado."); setTimeout(() => setDone(false), 1500);
  };
  return <Button size="sm" variant="outline" onClick={copy}>{done ? <Check className="size-4" /> : <Copy className="size-4" />}{label}</Button>;
}

/** Scripts curtos já abertos; prompts e notas longas fechados dentro das etapas. */
const startsOpen = (a: ActionPlanAsset, compact?: boolean) => a.kind === "script" || (!compact && a.kind !== "prompt");

/** Script, prompt, nota ou link do plano. Scripts e prompts vêm com "Copiar". */
export function AssetCard({ a, onEdit, onRemove, compact }: { a: ActionPlanAsset; onEdit?: () => void; onRemove?: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(() => startsOpen(a, compact));
  const kind = ASSET_KIND[a.kind];
  const copyable = (a.kind === "script" || a.kind === "prompt") && a.body;
  return (
    <Card className="group">
      <CardContent className="space-y-2 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("font-normal", kind.tone)} variant="secondary">{kind.label}</Badge>
          <button className="min-w-0 flex-1 truncate text-left text-sm font-medium" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {a.title}<ChevronDown className={cn("ml-1 inline size-3.5 transition-transform", open && "rotate-180")} />
          </button>
          {copyable && <CopyButton text={a.body as string} />}
          {a.url && <Button size="sm" variant="outline" asChild><a href={a.url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />Abrir</a></Button>}
          {onEdit && <Button size="icon" variant="ghost" className="size-8 opacity-0 group-hover:opacity-100" aria-label={`Editar ${a.title}`} onClick={onEdit}><Pencil className="size-4" /></Button>}
          {onRemove && <Button size="icon" variant="ghost" className="size-8 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100" aria-label={`Excluir ${a.title}`} onClick={onRemove}><Trash2 className="size-4" /></Button>}
        </div>
        {open && a.body && (a.kind === "nota"
          ? <Markdown>{a.body}</Markdown>
          : <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted/60 p-3 font-sans text-sm">{a.body}</pre>)}
      </CardContent>
    </Card>
  );
}
