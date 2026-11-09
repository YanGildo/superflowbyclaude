import { useState } from "react";
import { ArrowLeft, Copy, ExternalLink, FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/common/PageHeader";
import { FormEditor } from "@/components/siteforms/FormEditor";
import { NewFormDialog } from "@/components/siteforms/NewFormDialog";
import { useResponseCounts, useSiteFormActions, useSiteForms } from "@/hooks/useSiteForms";
import { SITE_URL } from "@/lib/siteForms";

/** Formulários das páginas do site (rgmarketingbr.com/diagnostico, /diagnostico-2...): editar, criar e ver respostas. */
export default function Formularios() {
  const { data: forms = [], isLoading } = useSiteForms();
  const { data: counts = {} } = useResponseCounts();
  const { remove } = useSiteFormActions();
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState("perguntas");
  const [creating, setCreating] = useState(false);
  const current = forms.find((f) => f.id === openId);

  const copy = (slug: string) => navigator.clipboard?.writeText(`${SITE_URL}/${slug}`).then(() => toast.success("Link copiado."), () => toast.error("Não consegui copiar."));
  const open = (id: string, t = "perguntas") => { setTab(t); setOpenId(id); };

  if (current) {
    return (
      <div>
        <Button type="button" variant="ghost" size="sm" className="mb-3" onClick={() => setOpenId(null)}><ArrowLeft className="size-4" />Todos os formulários</Button>
        <PageHeader eyebrow="Formulários" title={current.name} description={`${SITE_URL}/${current.slug}`} />
        <FormEditor key={current.id + tab} form={current} initialTab={tab} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="CRM Agência" title="Formulários" description="Páginas de formulário do site, uma por campanha. Edite as perguntas e o botão final, crie novas e veja as respostas."
        actions={<Button type="button" onClick={() => setCreating(true)}><Plus className="size-4" />Novo formulário</Button>} />
      {!isLoading && !forms.length && <EmptyState icon={FileText} title="Nenhum formulário ainda" description="Crie o primeiro e ele ganha uma página no site." action={<Button type="button" onClick={() => setCreating(true)}>Novo formulário</Button>} />}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {forms.map((f) => {
          const c = counts[f.id] ?? { total: 0, done: 0 };
          return (
            <Card key={f.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-heading font-semibold">{f.name}</p>
                <button type="button" onClick={() => copy(f.slug)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Copy className="size-3" />rgmarketingbr.com/{f.slug}</button></div>
                <Badge variant={f.active ? "default" : "outline"}>{f.active ? "No ar" : "Desligado"}</Badge></div>
              <p className="text-sm text-muted-foreground">{f.content.steps.length} perguntas · {c.total} começaram · {c.done} terminaram</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => open(f.id)}>Editar</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => open(f.id, "respostas")}>Respostas ({c.total})</Button>
                <Button type="button" size="sm" variant="ghost" asChild><a href={`${SITE_URL}/${f.slug}`} target="_blank" rel="noreferrer" aria-label={`Abrir ${f.slug}`}><ExternalLink className="size-4" /></a></Button>
                <Button type="button" size="sm" variant="ghost" className="text-destructive" aria-label={`Apagar ${f.name}`}
                  onClick={() => { if (window.confirm(`Apagar “${f.name}” e as ${c.total} respostas guardadas? Os leads já criados no CRM continuam.`)) remove.mutate(f.id); }}><Trash2 className="size-4" /></Button>
              </div>
            </Card>
          );
        })}
      </div>
      <NewFormDialog open={creating} onOpenChange={setCreating} forms={forms} onCreated={(f) => open(f.id)} />
    </div>
  );
}
