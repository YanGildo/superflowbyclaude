import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useEngine } from "@/hooks/useEngine";
import { useRunState } from "@/hooks/useProspectRunner";
import type { Prospect } from "@/integrations/supabase/types";
import { DEFAULT_ENRICH, type EnrichChoice } from "@/lib/mapsEngine";
import { EnrichSwitches } from "./EnrichSwitches";

/** Enriquecer os prospects filtrados na lista (de qualquer origem: motor, Apify ou CSV). */
export function EnrichButton({ list }: { list: Prospect[] }) {
  const engine = useEngine();
  const run = useRunState();
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<EnrichChoice>(DEFAULT_ENRICH);
  const [again, setAgain] = useState(false);
  const withSite = list.filter((p) => p.website);
  const todo = (again ? withSite : withSite.filter((p) => !p.enriched_at)).map((p) => p.id);
  const go = () => { void engine.enrich(todo, opts); setOpen(false); };
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={run.phase === "running"}><Sparkles className="size-4" />Enriquecer</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Enriquecer prospects</DialogTitle>
            <DialogDescription>O servidor visita o site de cada empresa da lista filtrada (só HTTP, sem IA) e preenche o que você marcar.</DialogDescription>
          </DialogHeader>
          <EnrichSwitches value={opts} onChange={setOpts} />
          <label className="flex items-center gap-2 text-sm"><Switch checked={again} onCheckedChange={setAgain} aria-label="Incluir já enriquecidos" />Incluir quem já foi enriquecido</label>
          <p className="text-sm text-muted-foreground">{todo.length} de {list.length} prospect(s) com site serão visitados.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={go} disabled={!todo.length}><Sparkles className="size-4" />Enriquecer {todo.length}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
