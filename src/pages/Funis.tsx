import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Plus, Trash2, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { FunnelEditor } from "@/components/funnels/FunnelEditor";
import { TEMPLATES, blockDef, type BlockData } from "@/components/funnels/blocks";
import { useFunnel, useFunnelMutations, useFunnels } from "@/hooks/useFunnels";
import { cn } from "@/lib/utils";

function NewFunnelDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const { create } = useFunnelMutations();
  const [name, setName] = useState("");
  const [tpl, setTpl] = useState("whatsapp");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Dê um nome ao funil.");
    const { nodes, edges } = TEMPLATES.find((t) => t.id === tpl)!.build();
    const id = await create.mutateAsync({ name, nodes, edges });
    setName(""); setError(null); onOpenChange(false); onCreated(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Novo funil</DialogTitle>
          <DialogDescription>Comece de um modelo e ajuste do seu jeito.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="fn-name">Nome</Label>
            <Input id="fn-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex.: Funil Pintores Flórida" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Modelo">
            {TEMPLATES.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={tpl === t.id} onClick={() => setTpl(t.id)}
                className={cn("rounded-lg border p-3 text-left transition-colors hover:bg-accent/50", tpl === t.id && "border-primary bg-primary/5 ring-1 ring-primary")}>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="size-4 animate-spin" />}Criar funil</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Funis() {
  const [params, setParams] = useSearchParams();
  const id = params.get("id");
  const { data: funnels = [], isLoading } = useFunnels();
  const { data: funnel, isLoading: loadingOne } = useFunnel(id);
  const { remove } = useFunnelMutations();
  const [newOpen, setNewOpen] = useState(false);

  const openFunnel = (fid: string | null) => setParams((p) => { if (fid) p.set("id", fid); else p.delete("id"); return p; });

  if (id) {
    if (loadingOne) return <Skeleton className="h-[70vh] rounded-xl" />;
    if (!funnel) return <EmptyState icon={Workflow} title="Funil não encontrado" action={<Button onClick={() => openFunnel(null)}>Voltar</Button>} />;
    return <FunnelEditor key={funnel.id} funnel={funnel} onBack={() => openFunnel(null)} />;
  }

  return (
    <div>
      <PageHeader eyebrow="Produtividade" title="Funis" description="Desenhe o caminho do cliente: de onde vem, por onde passa e onde compra."
        actions={<Button onClick={() => setNewOpen(true)}><Plus className="size-4" />Novo funil</Button>} />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
      ) : funnels.length === 0 ? (
        <EmptyState icon={Workflow} title="Nenhum funil ainda" description="Comece por um modelo pronto (WhatsApp, Telegram VIP, site, infoproduto)."
          action={<Button onClick={() => setNewOpen(true)}><Plus className="size-4" />Criar funil</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {funnels.map((f) => {
            const nodes = (f.nodes ?? []) as { data: BlockData }[];
            return (
              <Card key={f.id} className="group cursor-pointer transition-shadow hover:shadow-md" onClick={() => openFunnel(f.id)}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <button className="truncate text-left font-heading font-semibold hover:underline" onClick={(e) => { e.stopPropagation(); openFunnel(f.id); }}>{f.name}</button>
                    <Button size="icon" variant="ghost" className="-mr-2 -mt-1 size-8 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                      aria-label={`Excluir ${f.name}`} onClick={(e) => { e.stopPropagation(); remove.mutate(f.id); }}><Trash2 className="size-4" /></Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {nodes.slice(0, 6).map((n, i) => {
                      const d = blockDef(n.data?.kind);
                      return <span key={i} title={n.data?.label} className="flex size-7 items-center justify-center rounded-md text-white" style={{ background: d.color }}><d.icon className="size-3.5" /></span>;
                    })}
                    {nodes.length > 6 && <span className="text-xs text-muted-foreground">+{nodes.length - 6}</span>}
                    {nodes.length === 0 && <span className="text-xs text-muted-foreground">Vazio</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{nodes.length} blocos · editado {new Date(f.updated_at).toLocaleDateString("pt-BR")}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <NewFunnelDialog open={newOpen} onOpenChange={setNewOpen} onCreated={openFunnel} />
    </div>
  );
}
