import { useState } from "react";
import { FileDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCrmMutations } from "@/hooks/useCrm";
import { useQuestions, useStories } from "@/hooks/useContent";
import { useContentItems } from "@/hooks/useMarketing";
import type { ContentStory } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { Choice, CopyPrompt, Empty, Field } from "./ContentBits";
import { RecordingsPanel } from "./RecordingsPanel";

const EMPTY = { title: "", happened_on: "", body: "", number: "", result: "", tags: "" };

function NewStory() {
  const { save } = useCrmMutations("content_stories");
  const [f, setF] = useState(EMPTY);
  const field = (k: keyof typeof EMPTY) => ({ id: `st-${k}`, value: f[k], onChange: (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value })) });
  const submit = () => save.mutate({
    title: f.title.trim(), happened_on: f.happened_on || null, body: f.body.trim() || null, number: f.number.trim() || null,
    result: f.result.trim() || null, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
  }, { onSuccess: () => setF(EMPTY) });
  return (
    <details className="rounded-lg border bg-card p-3">
      <summary className="cursor-pointer text-sm font-medium">+ Nova história</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Field id="st-title" label="Título" className="sm:col-span-2"><Input {...field("title")} placeholder="Ex.: Cliente de Lisboa que dobrou os leads" /></Field>
        <Field id="st-happened_on" label="Data"><Input type="date" {...field("happened_on")} /></Field>
        <Field id="st-body" label="O que aconteceu" className="sm:col-span-3"><Textarea rows={3} {...field("body")} /></Field>
        <Field id="st-number" label="Número"><Input {...field("number")} placeholder="Ex.: R$ 18.000, 3x, 40 leads" /></Field>
        <Field id="st-result" label="Resultado"><Input {...field("result")} /></Field>
        <Field id="st-tags" label="Tags (vírgula)"><Input {...field("tags")} /></Field>
      </div>
      <Button className="mt-3" size="sm" onClick={submit} disabled={!f.title.trim() || save.isPending}><Plus className="size-4" />Salvar história</Button>
    </details>
  );
}

const storyMd = (list: ContentStory[]) => ["# Histórias", "", ...list.map((s) => [
  `## ${s.title}`, s.happened_on ? `- Data: ${s.happened_on.split("-").reverse().join("/")}` : "", s.body ? `- O que aconteceu: ${s.body}` : "",
  s.number ? `- Número: ${s.number}` : "", s.result ? `- Resultado: ${s.result}` : "", s.tags.length ? `- Tags: ${s.tags.join(", ")}` : "",
  `- Status: ${s.used_item_ids.length ? `usada em ${s.used_item_ids.length} peça(s)` : "não usada"}`, "",
].filter(Boolean).join("\n"))].join("\n");

function Stories() {
  const { data: stories = [] } = useStories();
  const { data: items = [] } = useContentItems();
  const { patch, remove } = useCrmMutations("content_stories");
  const link = (s: ContentStory, id: string) => patch.mutate({ id: s.id, values: { used_item_ids: [...new Set([...s.used_item_ids, id])] } });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Casos reais com número. É o mesmo conteúdo do <code>historias.md</code> da skill <code>minha-voz</code>.</p>
        <CopyPrompt variant="outline" text={() => storyMd(stories)} label="Exportar historias.md" />
      </div>
      <NewStory />
      {stories.length === 0 ? <Empty>Nenhuma história ainda.</Empty> : stories.map((s) => (
        <Card key={s.id}>
          <CardContent className="space-y-1.5 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="flex-1 font-medium">{s.title}</p>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px]", s.used_item_ids.length ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                {s.used_item_ids.length ? `Usada em ${s.used_item_ids.length}` : "Não usada"}
              </span>
              <Button size="icon" variant="ghost" className="size-7 hover:text-destructive" aria-label={`Apagar ${s.title}`} onClick={() => remove.mutate(s.id)}><Trash2 className="size-3.5" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">{[s.happened_on?.split("-").reverse().join("/"), s.number, s.result, s.tags.join(", ")].filter(Boolean).join(" · ")}</p>
            {s.body && <p className="text-sm">{s.body}</p>}
            {s.used_item_ids.length > 0 && <p className="text-xs text-muted-foreground">Peças: {s.used_item_ids.map((id) => items.find((c) => c.id === id)?.title ?? "(removida)").join(", ")}</p>}
            <div className="max-w-xs"><Choice id={`st-link-${s.id}`} value="" placeholder="Ligar a uma peça…" onChange={(v) => link(s, v)} options={items.map((c) => ({ value: c.id, label: c.title }))} /></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Questions() {
  const { data: qs = [] } = useQuestions();
  const { save, patch, remove } = useCrmMutations("client_questions");
  const [text, setText] = useState("");
  const [origin, setOrigin] = useState("");
  const add = () => save.mutate({ text: text.trim(), origin: origin.trim() || null }, { onSuccess: () => { setText(""); setOrigin(""); } });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Perguntas de clientes</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) add(); }} className="flex flex-wrap gap-2">
          <Input className="min-w-[220px] flex-1" value={text} onChange={(e) => setText(e.target.value)} placeholder="Pergunta do jeito que chegou…" aria-label="Nova pergunta" />
          <Input className="w-40" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Origem (direct, call…)" aria-label="Origem da pergunta" />
          <Button type="submit" disabled={!text.trim()}><Plus className="size-4" />Adicionar</Button>
        </form>
        {qs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma pergunta ainda. Elas entram no pedido da pauta.</p> : (
          <ul className="space-y-1">{qs.map((q) => (
            <li key={q.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={q.used} onCheckedChange={(c) => patch.mutate({ id: q.id, values: { used: Boolean(c) } })} aria-label={`Já usada: ${q.text}`} />
              <span className={cn("flex-1", q.used && "text-muted-foreground line-through")}>{q.text}</span>
              <span className="text-xs text-muted-foreground">{[q.origin, q.asked_on.split("-").reverse().join("/")].filter(Boolean).join(" · ")}</span>
              <Button size="icon" variant="ghost" className="size-7 hover:text-destructive" aria-label={`Apagar pergunta ${q.text}`} onClick={() => remove.mutate(q.id)}><Trash2 className="size-3.5" /></Button>
            </li>
          ))}</ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Pautas e histórias: histórias reais, gravações (pauta → peças) e perguntas de clientes. */
export function StoriesTab() {
  const [tab, setTab] = useState<"historias" | "gravacoes">("historias");
  return (
    <div className="space-y-4">
      <div className="flex w-fit rounded-lg border bg-card p-0.5" role="tablist" aria-label="Pautas e histórias">
        <Button size="sm" role="tab" aria-selected={tab === "historias"} variant={tab === "historias" ? "default" : "ghost"} onClick={() => setTab("historias")}>Histórias</Button>
        <Button size="sm" role="tab" aria-selected={tab === "gravacoes"} variant={tab === "gravacoes" ? "default" : "ghost"} onClick={() => setTab("gravacoes")}><FileDown className="size-4" />Gravações</Button>
      </div>
      {tab === "historias" ? <Stories /> : <RecordingsPanel />}
      <Questions />
    </div>
  );
}
