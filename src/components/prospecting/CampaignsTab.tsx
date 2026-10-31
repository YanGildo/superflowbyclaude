import { useState, type FormEvent } from "react";
import { Megaphone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/PageHeader";
import { useProspectActions, useProspectCampaigns, useProspects } from "@/hooks/useProspects";

/** Campanhas de prospecção: agrupam prospects por nicho/região/objetivo e mostram o andamento. */
export function CampaignsTab() {
  const { data: campaigns = [] } = useProspectCampaigns();
  const { data: prospects = [] } = useProspects();
  const { saveCampaign } = useProspectActions();
  const [f, setF] = useState({ name: "", niche: "", location: "", objective: "" });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    saveCampaign.mutate({ ...f, name: f.name.trim(), status: "ativa" });
    setF({ name: "", niche: "", location: "", objective: "" });
  };
  const count = (id: string, st?: string) => prospects.filter((p) => p.campaign_id === id && (!st || p.status === st)).length;

  return (
    <div className="space-y-4">
      <Card><CardContent className="p-4">
        <form onSubmit={submit} className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr_1.4fr_auto]">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Nome da campanha" aria-label="Nome da campanha" className="h-9" />
          <Input value={f.niche} onChange={(e) => setF({ ...f, niche: e.target.value })} placeholder="Nicho" aria-label="Nicho" className="h-9" />
          <Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Região" aria-label="Região" className="h-9" />
          <Input value={f.objective} onChange={(e) => setF({ ...f, objective: e.target.value })} placeholder="Objetivo (ex.: 10 reuniões)" aria-label="Objetivo" className="h-9" />
          <Button type="submit" disabled={!f.name.trim()}><Plus className="size-4" />Criar</Button>
        </form>
      </CardContent></Card>
      {campaigns.length === 0 ? <EmptyState icon={Megaphone} title="Nenhuma campanha de prospecção" description="Crie uma campanha e vincule os prospects pelo menu de cada um na lista." /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.id}><CardContent className="space-y-2 p-4">
              <p className="font-heading font-semibold">{c.name}</p>
              <p className="text-xs text-muted-foreground">{[c.niche, c.location].filter(Boolean).join(" · ") || "Sem nicho/região"}</p>
              {c.objective && <p className="text-xs">🎯 {c.objective}</p>}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                <div className="rounded-md bg-muted/60 p-2"><p className="font-heading text-lg font-semibold">{count(c.id)}</p>prospects</div>
                <div className="rounded-md bg-muted/60 p-2"><p className="font-heading text-lg font-semibold">{count(c.id, "Abordado") + count(c.id, "Respondeu")}</p>abordados</div>
                <div className="rounded-md bg-success/10 p-2 text-success"><p className="font-heading text-lg font-semibold">{count(c.id, "Virou lead")}</p>leads</div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
