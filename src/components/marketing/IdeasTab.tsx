import { useState, type FormEvent } from "react";
import { ArrowRight, Lightbulb, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/common/PageHeader";
import { RefSelect } from "@/components/common/RefSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCrmMutations } from "@/hooks/useCrm";
import { useContentItems } from "@/hooks/useMarketing";
import { useMarketingDialogs } from "@/hooks/useMarketingDialogs";
import type { ContentItem } from "@/integrations/supabase/types";
import { CONTENT_KINDS } from "@/lib/marketing";
import { opts } from "./options";

function QuickAdd() {
  const { save } = useCrmMutations("content_items");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("Post");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    save.mutate({ title: title.trim(), kind, stage: "ideia" });
    setTitle("");
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2 rounded-xl border bg-card p-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Anote uma ideia e aperte Enter" aria-label="Nova ideia" className="min-w-52 flex-1" />
      <div className="w-36"><RefSelect value={kind} onChange={(v) => setKind(v ?? "Post")} options={opts(CONTENT_KINDS)} placeholder="Tipo" /></div>
      <Button type="submit" disabled={!title.trim()}><Plus className="size-4" />Anotar</Button>
    </form>
  );
}

function IdeaRow({ item }: { item: ContentItem }) {
  const { patch, remove } = useCrmMutations("content_items");
  const { openContent } = useMarketingDialogs();
  return (
    <div className="group flex items-center gap-3 border-b px-3 py-2 last:border-0 hover:bg-accent/40">
      <Lightbulb className="size-4 shrink-0 text-warning" />
      <button type="button" onClick={() => openContent(item)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="text-[11px] text-muted-foreground">{[item.kind, item.channel].filter(Boolean).join(" · ")}</p>
      </button>
      <Button variant="outline" size="sm" onClick={() => patch.mutate({ id: item.id, values: { stage: "roteiro" } })}>
        Virar roteiro<ArrowRight className="size-3.5" />
      </Button>
      <button type="button" aria-label={`Excluir ${item.title}`} onClick={() => remove.mutate(item.id)}
        className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
    </div>
  );
}

/** Backlog: ideias soltas que ainda não entraram em produção. */
export function IdeasTab() {
  const { data = [] } = useContentItems();
  const ideas = data.filter((c) => c.stage === "ideia");
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-heading text-xl font-semibold">Ideias e backlog</h2>
        <p className="text-sm text-muted-foreground">Anote rápido. Quando for produzir, transforme em roteiro.</p>
      </div>
      <QuickAdd />
      {ideas.length
        ? <div className="overflow-hidden rounded-xl border bg-card">{ideas.map((i) => <IdeaRow key={i.id} item={i} />)}</div>
        : <EmptyState icon={Lightbulb} title="Nenhuma ideia anotada" description="Tudo que surgir — post, vídeo, campanha — anote aqui." />}
    </div>
  );
}
