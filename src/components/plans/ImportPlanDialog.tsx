import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardCopy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useImportPlan } from "@/hooks/useActionPlans";
import { UNIVERSAL_PLAN_PROMPT, parseImportedPlan, type ImportedPlan } from "@/lib/planPrompt";

/** Passo 1: copiar o prompt universal para usar em qualquer IA. */
function PromptTab({ onNext }: { onNext: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(UNIVERSAL_PLAN_PROMPT); setCopied(true); toast.success("Prompt copiado."); }
    catch { toast.error("Não consegui copiar. Selecione o texto e copie manualmente."); }
  };
  return (
    <div className="space-y-3">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Copie o prompt e cole em qualquer IA (Claude, ChatGPT, Gemini...).</li>
        <li>No fim, troque o texto entre colchetes pelo seu planejamento e envie.</li>
        <li>Copie a resposta inteira da IA e cole na aba <strong>Colar resultado</strong>.</li>
      </ol>
      <Textarea readOnly rows={12} value={UNIVERSAL_PLAN_PROMPT} className="font-mono text-xs" aria-label="Prompt universal" onFocus={(e) => e.target.select()} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void copy()}>{copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}Copiar prompt</Button>
        <Button variant="outline" onClick={onNext}>Já tenho o resultado</Button>
      </div>
    </div>
  );
}

/** Resumo do que vai ser criado. */
function Preview({ plan }: { plan: ImportedPlan }) {
  const phases = [...new Set(plan.steps.map((s) => s.phase))];
  return (
    <div className="space-y-1 rounded-lg border bg-success/5 p-3 text-sm">
      <p className="font-medium">{plan.title}</p>
      {plan.goal && <p className="text-muted-foreground">Meta: {plan.goal}</p>}
      <p className="text-muted-foreground">
        {phases.length} fase(s) · {plan.steps.length} etapa(s) · {plan.assets.length} script(s)/prompt(s){plan.metrics.length ? ` · ${plan.metrics.length} número(s) da semana` : ""}
      </p>
    </div>
  );
}

/** Passo 2: colar o JSON devolvido pela IA e criar o plano. */
function PasteTab({ onCreated }: { onCreated: (id: string) => void }) {
  const [text, setText] = useState("");
  const importPlan = useImportPlan();
  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    try { return { plan: parseImportedPlan(text), error: null }; } catch (e) { return { plan: null, error: (e as Error).message }; }
  }, [text]);
  return (
    <div className="space-y-3">
      <Textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder="Cole aqui a resposta da IA (o bloco JSON)" className="font-mono text-xs" aria-label="Resultado da IA" />
      {parsed?.error && <p className="text-sm text-destructive" role="alert">{parsed.error}</p>}
      {parsed?.plan && <Preview plan={parsed.plan} />}
      <DialogFooter>
        <Button disabled={!parsed?.plan || importPlan.isPending} onClick={() => parsed?.plan && importPlan.mutate(parsed.plan, { onSuccess: onCreated })}>
          {importPlan.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}Criar plano
        </Button>
      </DialogFooter>
    </div>
  );
}

/** Criar plano com IA: prompt universal para copiar + colar o resultado. */
export function ImportPlanDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const [tab, setTab] = useState("prompt");
  useEffect(() => { if (open) setTab("prompt"); }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Criar plano com IA</DialogTitle>
          <DialogDescription>Funciona com qualquer IA: ela devolve o plano no formato do Superflow e você só cola aqui.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="prompt">1 · Prompt universal</TabsTrigger><TabsTrigger value="paste">2 · Colar resultado</TabsTrigger></TabsList>
          <TabsContent value="prompt" className="pt-3"><PromptTab onNext={() => setTab("paste")} /></TabsContent>
          <TabsContent value="paste" className="pt-3"><PasteTab onCreated={(id) => { onOpenChange(false); onCreated(id); }} /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
