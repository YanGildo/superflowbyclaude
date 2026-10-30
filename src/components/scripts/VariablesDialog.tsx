import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCrmMutations } from "@/hooks/useCrm";
import type { Script, ScriptSegment } from "@/integrations/supabase/types";
import { scriptVars } from "@/lib/scripts";

/** Valores fixos das variáveis do segmento (chave Pix, prazo, Instagram…); [nome] fica para cada conversa. */
export function VariablesDialog({ open, onOpenChange, segment, scripts }: {
  open: boolean; onOpenChange: (o: boolean) => void; segment: ScriptSegment | null; scripts: Script[];
}) {
  const { patch } = useCrmMutations("script_segments");
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => { if (open) setValues(segment?.variables ?? {}); }, [open, segment]);
  const vars = [...new Set(scripts.flatMap((s) => scriptVars(s.body)))].filter((v) => v !== "nome").sort();
  const save = () => {
    if (!segment) return;
    patch.mutate({ id: segment.id, values: { variables: values } }, { onSuccess: () => onOpenChange(false) });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Variáveis — {segment?.name}</DialogTitle>
          <DialogDescription>O que você preencher aqui entra sozinho ao copiar. Deixe em branco o que muda a cada cliente.</DialogDescription>
        </DialogHeader>
        {vars.length === 0 ? <p className="text-sm text-muted-foreground">Os scripts deste segmento ainda não usam variáveis.</p> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {vars.map((v) => (
              <div key={v} className="space-y-1">
                <Label htmlFor={`sv-${v}`} className="text-xs">[{v}]</Label>
                <Input id={`sv-${v}`} value={values[v] ?? ""} onChange={(e) => setValues((p) => ({ ...p, [v]: e.target.value }))} className="h-9" />
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={!segment || patch.isPending}>Salvar variáveis</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
