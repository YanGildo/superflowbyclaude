import { useEffect, useState } from "react";
import { BellRing, Facebook } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RefSelect } from "@/components/common/RefSelect";
import { useLeadAlert } from "@/hooks/useLeadAlerts";
import type { Pipeline, PipelineStage } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

const TONE = { pendente: "bg-warning/15 text-warning", enviado: "bg-success/15 text-success", falhou: "bg-destructive/10 text-destructive" } as const;
const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Aviso por e-mail a cada lead novo na campanha (vai para a fila e sai pelo Resend). */
export function AlertsDialog({ pipeline, open, onOpenChange }: { pipeline: Pipeline; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { alert, outbox, saveAlert } = useLeadAlert(pipeline.id, open);
  const [emails, setEmails] = useState("");
  const [active, setActive] = useState(true);
  useEffect(() => { if (open) { setEmails((alert.data?.emails ?? []).join(", ")); setActive(alert.data?.active ?? true); } }, [open, alert.data]);
  const list = emails.split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
  const bad = list.filter((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  const save = async () => { await saveAlert.mutateAsync({ emails: list, active }); onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2"><BellRing className="size-4" />Avisos de lead novo</DialogTitle>
          <DialogDescription>Cada lead que entrar em "{pipeline.name}" (site, CSV ou Meta) gera um e-mail com nome, WhatsApp, temperatura e as respostas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="alert-emails">Enviar para (separe por vírgula)</Label>
            <Input id="alert-emails" value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="voce@email.com, cliente@email.com" />
            {bad.length > 0 && <p className="text-xs text-destructive">E-mail inválido: {bad.join(", ")}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={active} onCheckedChange={setActive} aria-label="Aviso ligado" />Aviso ligado</label>
          <p className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">Os avisos entram na fila na hora. O envio começa quando a chave do Resend estiver configurada (veja Integrações).</p>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Últimos avisos deste espaço</p>
            {(outbox.data ?? []).length === 0 ? <p className="text-xs text-muted-foreground">Nenhum ainda.</p> : (
              <ul className="space-y-1 text-xs">{outbox.data?.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2"><span className="truncate">{when(o.created_at)} · {o.subject}</span>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5", TONE[o.status])} title={o.error ?? ""}>{o.status}</span></li>
              ))}</ul>
            )}
          </div>
        </div>
        <DialogFooter><Button onClick={() => void save()} disabled={saveAlert.isPending || bad.length > 0}>Salvar aviso</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Liga um formulário (ou todos de uma página) do Meta a esta campanha. */
export function MetaRouteDialog({ pipeline, stages, open, onOpenChange }: { pipeline: Pipeline; stages: PipelineStage[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { route, saveRoute } = useLeadAlert(pipeline.id, open);
  const [page, setPage] = useState("*");
  const [form, setForm] = useState("*");
  const [stage, setStage] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  useEffect(() => {
    if (!open) return;
    setPage(route.data?.page_id ?? "*"); setForm(route.data?.form_id ?? "*"); setStage(route.data?.stage_id ?? stages[0]?.id ?? null); setActive(route.data?.active ?? true);
  }, [open, route.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => { await saveRoute.mutateAsync({ page_id: page.trim() || "*", form_id: form.trim() || "*", stage_id: stage, active }); onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2"><Facebook className="size-4" />Leads do Meta automáticos</DialogTitle>
          <DialogDescription>Quando a conexão com o Meta estiver ativa, os leads do Formulário instantâneo caem direto em "{pipeline.name}".</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label htmlFor="meta-page">ID da página</Label><Input id="meta-page" value={page} onChange={(e) => setPage(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="meta-form">ID do formulário</Label><Input id="meta-form" value={form} onChange={(e) => setForm(e.target.value)} /></div>
          <p className="col-span-2 text-[11px] text-muted-foreground">"*" = qualquer um. O ID do formulário aparece no CSV (coluna form_id, sem o "f:") ou no Gerenciador → Formulários.</p>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="meta-stage">Etapa de entrada</Label><RefSelect id="meta-stage" value={stage} onChange={setStage} options={stages} placeholder="Primeira etapa" /></div>
          <label className="col-span-2 flex items-center gap-2 text-sm"><Switch checked={active} onCheckedChange={setActive} aria-label="Ligação ativa" />Ligação ativa {route.data && <Badge variant="outline">salva</Badge>}</label>
        </div>
        <DialogFooter><Button onClick={() => void save()} disabled={saveRoute.isPending}>Salvar ligação</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
