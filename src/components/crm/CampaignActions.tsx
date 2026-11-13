import { useEffect, useState } from "react";
import { Archive, ArchiveRestore, FileUp, MoreHorizontal, Pencil, Thermometer, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/common/RefSelect";
import { useCampaigns } from "@/hooks/useCampaigns";
import type { Pipeline, PipelineStage } from "@/integrations/supabase/types";
import { rulesOf } from "@/lib/leadImport";
import { ImportLeadsDialog } from "./ImportLeadsDialog";

type Temp = "quente" | "morno" | "frio";
const TEMPS: { value: Temp; label: string }[] = [{ value: "quente", label: "Quente" }, { value: "morno", label: "Morno" }, { value: "frio", label: "Frio" }];
const ORDER: Temp[] = ["quente", "morno", "frio"];

/** Regras de temperatura da campanha: termos separados por vírgula para cada temperatura. */
function TemperatureDialog({ pipeline, open, onOpenChange }: { pipeline: Pipeline; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { update } = useCampaigns();
  const [terms, setTerms] = useState<Record<Temp, string>>({ quente: "", morno: "", frio: "" });
  const [fallback, setFallback] = useState<Temp>("morno");
  useEffect(() => {
    if (!open) return;
    const cfg = rulesOf(pipeline);
    setTerms(Object.fromEntries(ORDER.map((t) => [t, cfg.rules.filter((r) => r.temperature === t).flatMap((r) => r.contains).join(", ")])) as Record<Temp, string>);
    setFallback(cfg.fallback);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    const rules = ORDER.map((t) => ({ temperature: t, contains: terms[t].split(",").map((x) => x.trim()).filter(Boolean) })).filter((r) => r.contains.length);
    await update.mutateAsync({ id: pipeline.id, values: { temperature_rules: { rules, fallback } } });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Regras de temperatura</DialogTitle>
          <DialogDescription>Na importação, se alguma resposta do formulário contiver um destes termos, o lead recebe a temperatura. Vale a primeira que bater, de cima para baixo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {ORDER.map((t) => (
            <div key={t} className="space-y-1.5">
              <Label htmlFor={`temp-${t}`}>{TEMPS.find((x) => x.value === t)?.label}: respostas contendo</Label>
              <Input id={`temp-${t}`} value={terms[t]} onChange={(e) => setTerms((p) => ({ ...p, [t]: e.target.value }))} placeholder="termo 1, termo 2" />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="temp-fallback">Se nenhuma regra bater</Label>
            <SimpleSelect id="temp-fallback" value={fallback} onChange={setFallback} options={TEMPS} />
          </div>
        </div>
        <DialogFooter><Button onClick={() => void save()} disabled={update.isPending}>Salvar regras</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({ pipeline, open, onOpenChange }: { pipeline: Pipeline; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { update } = useCampaigns();
  const [name, setName] = useState(pipeline.name);
  useEffect(() => { if (open) setName(pipeline.name); }, [open, pipeline.name]);
  const save = async () => { if (!name.trim()) return; await update.mutateAsync({ id: pipeline.id, values: { name: name.trim() } }); onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-heading">Renomear campanha</DialogTitle><DialogDescription>As etapas e os cards continuam iguais.</DialogDescription></DialogHeader>
        <Label htmlFor="rename-camp">Nome</Label>
        <Input id="rename-camp" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <DialogFooter><Button onClick={() => void save()} disabled={update.isPending || !name.trim()}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Botão de importar + menu da campanha (regras, renomear, arquivar, excluir). */
export function CampaignActions({ pipeline, stages, dealCount, onRemoved }: {
  pipeline: Pipeline; stages: PipelineStage[]; dealCount: number; onRemoved: () => void;
}) {
  const { update, remove } = useCampaigns();
  const [open, setOpen] = useState<"import" | "temp" | "rename" | null>(null);
  const archived = Boolean(pipeline.archived_at);
  const close = (o: boolean) => { if (!o) setOpen(null); };
  const del = () => {
    if (!window.confirm(`Excluir a campanha "${pipeline.name}" e as etapas dela?`)) return;
    remove.mutate(pipeline.id, { onSuccess: onRemoved });
  };
  return (
    <>
      <Button variant="outline" onClick={() => setOpen("import")}><FileUp className="size-4" />Importar leads (CSV)</Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="Opções da campanha"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setOpen("temp")}><Thermometer className="size-4" />Regras de temperatura</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setOpen("rename")}><Pencil className="size-4" />Renomear</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => update.mutate({ id: pipeline.id, values: { archived_at: archived ? null : new Date().toISOString() } })}>
            {archived ? <><ArchiveRestore className="size-4" />Restaurar campanha</> : <><Archive className="size-4" />Arquivar campanha</>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={dealCount > 0} onSelect={del} className="text-destructive">
            <Trash2 className="size-4" />{dealCount > 0 ? "Excluir (só sem negócios)" : "Excluir campanha"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ImportLeadsDialog open={open === "import"} onOpenChange={close} pipeline={pipeline} stages={stages} />
      <TemperatureDialog open={open === "temp"} onOpenChange={close} pipeline={pipeline} />
      <RenameDialog open={open === "rename"} onOpenChange={close} pipeline={pipeline} />
    </>
  );
}
