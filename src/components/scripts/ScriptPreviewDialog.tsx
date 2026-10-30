import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Script } from "@/integrations/supabase/types";
import { fillVars, scriptVars } from "@/lib/scripts";
import { ScriptText } from "./ScriptText";

/** Prévia com campos para cada variável: preenche, confere e copia (ou abre no WhatsApp). */
export function ScriptPreviewDialog({ script, defaults, onClose }: { script: Script | null; defaults: Record<string, string>; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(defaults);
  useEffect(() => { if (script) setValues(defaults); }, [script]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!script) return null;
  const vars = scriptVars(script.body);
  const text = fillVars(script.body, values);
  const copy = async () => { await navigator.clipboard.writeText(text); toast.success("Script copiado."); };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">{script.title}</DialogTitle>
          <DialogDescription>{script.moment ?? "Preencha as variáveis e copie."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="space-y-2">
            {vars.length === 0 && <p className="text-sm text-muted-foreground">Este script não tem variáveis.</p>}
            {vars.map((v) => (
              <div key={v} className="space-y-1">
                <Label htmlFor={`var-${v}`} className="text-xs">[{v}]</Label>
                <Input id={`var-${v}`} value={values[v] ?? ""} onChange={(e) => setValues((p) => ({ ...p, [v]: e.target.value }))} className="h-8" />
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-muted/50 p-4"><ScriptText body={text} /></div>
        </div>
        <DialogFooter>
          <Button asChild variant="outline"><a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />Abrir no WhatsApp</a></Button>
          <Button onClick={copy}><Copy className="size-4" />Copiar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
