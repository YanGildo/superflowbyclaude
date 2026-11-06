import { useMemo, useState } from "react";
import { Copy, MessageCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useScriptSegments, useScripts } from "@/hooks/useCrm";
import { useProspectActions } from "@/hooks/useProspects";
import type { Prospect, Script } from "@/integrations/supabase/types";
import { waLink } from "@/lib/crm";
import { prospectVars } from "@/lib/prospecting";
import { fillVars, matchesScript } from "@/lib/scripts";
import { cn } from "@/lib/utils";

/** Escolhe um script do espaço, já preenchido com os dados do prospect, para copiar ou abrir no WhatsApp. */
export function ProspectScriptDialog({ p, open, onOpenChange }: { p: Prospect; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: scripts = [] } = useScripts();
  const { data: segments = [] } = useScriptSegments();
  const { record } = useProspectActions();
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<Script | null>(null);
  const [text, setText] = useState("");
  const list = useMemo(() => scripts.filter((s) => matchesScript(s, q)).slice(0, 60), [scripts, q]);
  const choose = (s: Script) => {
    const seg = segments.find((x) => x.id === s.segment_id);
    setPick(s); setText(fillVars(s.body, { ...(seg?.variables ?? {}), ...prospectVars(p) }));
  };
  const wa = waLink(p.whatsapp ?? p.phone, text);
  const used = () => record.mutate({ p, kind: `Script usado: ${pick?.title ?? ""}` });
  const copy = async () => { await navigator.clipboard?.writeText(text).catch(() => undefined); toast.success("Mensagem copiada."); used(); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Usar script · {p.name}</DialogTitle>
          <DialogDescription>Os dados que o prospect já tem entram sozinhos ([empresa], [cidade], [nicho], [site], [telefone]). O que faltar fica entre colchetes para você completar.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-[260px_1fr]">
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar script…" aria-label="Buscar script" className="h-9 pl-8" />
            </div>
            <div className="max-h-[50vh] space-y-1 overflow-y-auto pr-1" role="listbox" aria-label="Scripts">
              {list.length === 0 && <p className="text-sm text-muted-foreground">Nenhum script. Crie em Scripts.</p>}
              {list.map((s) => (
                <button key={s.id} type="button" role="option" aria-selected={pick?.id === s.id} onClick={() => choose(s)}
                  className={cn("w-full rounded-md border px-2.5 py-1.5 text-left text-sm", pick?.id === s.id ? "border-primary bg-primary/5" : "hover:bg-accent")}>
                  <span className="block truncate font-medium">{s.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{[segments.find((x) => x.id === s.segment_id)?.name, s.moment].filter(Boolean).join(" · ")}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {pick ? (
              <>
                <Textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} aria-label="Mensagem" />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={copy}><Copy className="size-4" />Copiar mensagem</Button>
                  {wa && <Button variant="outline" asChild><a href={wa} target="_blank" rel="noreferrer" onClick={used}><MessageCircle className="size-4" />Abrir no WhatsApp</a></Button>}
                </div>
              </>
            ) : <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Escolha um script ao lado.</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
