import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import type { Priority, Project } from "@/integrations/supabase/types";
import { useProjectMutations } from "@/hooks/useProjectsGoals";
import { useWorkspace } from "@/lib/workspace";
import { PRIORITIES, PRIORITY, PROJECT_CATEGORIES, PROJECT_STATUSES, PROJECT_STATUS_LABEL } from "@/lib/labels";

const COLORS = ["#0D47A1", "#26C6DA", "#059669", "#d97706", "#dc2626", "#7c3aed", "#db2777", "#475569"];

type Form = {
  name: string; description: string; category: string; status: string; priority: Priority;
  start_date: string; deadline: string; link: string; color: string; business_id: string | null;
};

const empty = (businessId: string | null): Form => ({
  name: "", description: "", category: "Interno", status: "planejado", priority: "media",
  start_date: "", deadline: "", link: "", color: COLORS[0], business_id: businessId,
});

export function ProjectDialog({
  open, onOpenChange, project,
}: { open: boolean; onOpenChange: (o: boolean) => void; project?: Project | null }) {
  const { businesses, businessFilter } = useWorkspace();
  const { save } = useProjectMutations();
  const [f, setF] = useState<Form>(empty(null));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(project ? {
      name: project.name, description: project.description ?? "", category: project.category ?? "Outro",
      status: project.status, priority: project.priority, start_date: project.start_date ?? "",
      deadline: project.deadline ?? "", link: project.link ?? "", color: project.color ?? COLORS[0],
      business_id: project.business_id,
    } : empty(businessFilter === "all" ? null : businessFilter));
  }, [open, project, businessFilter]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return setError("Dê um nome ao projeto.");
    if (f.start_date && f.deadline && f.deadline < f.start_date) return setError("O prazo não pode ser antes do início.");
    await save.mutateAsync({
      id: project?.id, name: f.name, description: f.description || null, category: f.category, status: f.status,
      priority: f.priority, start_date: f.start_date || null, deadline: f.deadline || null, link: f.link || null,
      color: f.color, business_id: f.business_id,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{project ? "Editar projeto" : "Novo projeto"}</DialogTitle>
          <DialogDescription>Projetos agrupam tarefas e metas de uma mesma iniciativa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pj-name">Nome</Label>
            <Input id="pj-name" value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pj-desc">Descrição</Label>
            <Textarea id="pj-desc" rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pj-cat">Categoria</Label>
            <SimpleSelect id="pj-cat" value={f.category} onChange={(v) => set("category", v)}
              options={PROJECT_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pj-status">Status</Label>
            <SimpleSelect id="pj-status" value={f.status} onChange={(v) => set("status", v)}
              options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABEL[s] }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pj-start">Início</Label>
            <Input id="pj-start" type="date" value={f.start_date} onChange={(e) => set("start_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pj-deadline">Prazo</Label>
            <Input id="pj-deadline" type="date" value={f.deadline} onChange={(e) => set("deadline", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pj-prio">Prioridade</Label>
            <SimpleSelect id="pj-prio" value={f.priority} onChange={(v) => set("priority", v)}
              options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY[p].label }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pj-biz">Negócio</Label>
            <RefSelect id="pj-biz" value={f.business_id} onChange={(v) => set("business_id", v)} options={businesses} placeholder="Sem negócio" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pj-link">Link (opcional)</Label>
            <Input id="pj-link" type="url" placeholder="https://" value={f.link} onChange={(e) => set("link", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Cor</Label>
            <div className="flex gap-2" role="radiogroup" aria-label="Cor do projeto">
              {COLORS.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={f.color === c} aria-label={`Cor ${c}`}
                  onClick={() => set("color", c)}
                  className="size-7 rounded-full ring-offset-2 ring-offset-background transition-shadow aria-checked:ring-2 aria-checked:ring-ring"
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {project ? "Salvar" : "Criar projeto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
