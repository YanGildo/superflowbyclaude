import { useState } from "react";
import { ArrowRight, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCrmMutations } from "@/hooks/useCrm";
import { useFormulas, useHooks } from "@/hooks/useContent";
import type { Hook } from "@/integrations/supabase/types";
import { fmtNum } from "@/lib/content";
import { scoreHook, VERDICT_TONE, type Verdict } from "@/lib/hookScore";
import { cn } from "@/lib/utils";
import { Choice, Empty, Field, HookBadge, LinkOut } from "./ContentBits";

const EMPTY = { text: "", template: "", formula: "", niche: "", kind: "", views: "", source: "", link: "" };

function NewHook() {
  const { save } = useCrmMutations("hooks");
  const { data: formulas = [] } = useFormulas();
  const [f, setF] = useState(EMPTY);
  const field = (k: keyof typeof EMPTY) => ({ id: `hk-${k}`, value: f[k], onChange: (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value })) });
  const submit = () => {
    const r = scoreHook(f.text);
    save.mutate({
      text: f.text.trim(), template: f.template.trim() || null, formula_id: f.formula ? Number(f.formula) : null, niche: f.niche.trim() || null,
      kind: f.kind.trim() || null, views: f.views ? Number(f.views.replace(/\D/g, "")) : null, source: f.source.trim() || null, link: f.link.trim() || null,
      score: r.score, verdict: r.verdict, weakest: r.weakest,
    }, { onSuccess: () => { setF(EMPTY); toast.success("Gancho salvo no banco."); } });
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Testar ou salvar um gancho</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Field id="hk-text" label="Gancho"><Input {...field("text")} placeholder="Ex.: Ninguém te conta que os seus primeiros 30 reels vão flopar." /></Field>
        <HookBadge text={f.text} showParts />
        <div className="grid gap-2 sm:grid-cols-4">
          <Field id="hk-formula" label="Fórmula"><Choice id="hk-formula" value={f.formula} onChange={(v) => setF((x) => ({ ...x, formula: v }))} options={formulas.map((x) => ({ value: String(x.id), label: `${x.id}. ${x.name}` }))} /></Field>
          <Field id="hk-niche" label="Nicho"><Input {...field("niche")} /></Field>
          <Field id="hk-views" label="Views"><Input inputMode="numeric" {...field("views")} /></Field>
          <Field id="hk-source" label="Criador / origem"><Input {...field("source")} /></Field>
          <Field id="hk-template" label="Molde (com colchetes)" className="sm:col-span-2"><Input {...field("template")} /></Field>
          <Field id="hk-kind" label="Tipo"><Input {...field("kind")} placeholder="Reels, carrossel…" /></Field>
          <Field id="hk-link" label="Link"><Input {...field("link")} /></Field>
        </div>
        <Button onClick={submit} disabled={!f.text.trim() || save.isPending}><Plus className="size-4" />Salvar no banco</Button>
      </CardContent>
    </Card>
  );
}

function HookRow({ h, formula, onUse, onDelete }: { h: Hook; formula?: string; onUse: () => void; onDelete: () => void }) {
  const v = (h.verdict ?? "FRACO") as Verdict;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", VERDICT_TONE[v])}>{v} · {h.score}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{h.text}</p>
        <p className="text-xs text-muted-foreground">{[formula, h.niche, h.views != null ? `${fmtNum(h.views)} views` : null, h.source, h.weakest ? `fraco: ${h.weakest}` : null].filter(Boolean).join(" · ")}</p>
        {h.template && <p className="text-xs italic text-muted-foreground">Molde: {h.template}</p>}
      </div>
      <LinkOut href={h.link}>Ver</LinkOut>
      <Button size="sm" variant="outline" onClick={onUse}>Usar este<ArrowRight className="size-4" /></Button>
      <Button size="icon" variant="ghost" className="size-8 hover:text-destructive" aria-label={`Apagar gancho ${h.text}`} onClick={onDelete}><Trash2 className="size-4" /></Button>
    </div>
  );
}

/** Banco de ganchos (Hook Vault): nota automática, busca e "Usar este" para virar peça. */
export function HooksTab() {
  const { data: hooks = [] } = useHooks();
  const { data: formulas = [] } = useFormulas();
  const { remove } = useCrmMutations("hooks");
  const items = useCrmMutations("content_items");
  const [q, setQ] = useState("");
  const [formula, setFormula] = useState("todas");
  const [minViews, setMinViews] = useState("");
  const name = (id: number | null) => formulas.find((x) => x.id === id)?.name;
  const list = hooks.filter((h) => (!q || `${h.text} ${h.niche ?? ""} ${h.source ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    && (formula === "todas" || String(h.formula_id) === formula) && (!minViews || (h.views ?? 0) >= Number(minViews)));
  const use = (h: Hook) => items.save.mutate({ title: h.text.slice(0, 80), hook: h.text, hook_formula_id: h.formula_id, stage: "ideia", kind: "Reels", channel: "Instagram" },
    { onSuccess: () => toast.success("Virou ideia em Produção.") });

  return (
    <div className="space-y-4">
      <NewHook />
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar gancho, nicho ou criador…" aria-label="Buscar gancho" className="pl-8" />
        </div>
        <div className="w-56"><Choice id="hk-filter" value={formula} onChange={setFormula} options={[{ value: "todas", label: "Todas as fórmulas" }, ...formulas.map((x) => ({ value: String(x.id), label: `${x.id}. ${x.name}` }))]} /></div>
        <Input className="w-32" inputMode="numeric" value={minViews} onChange={(e) => setMinViews(e.target.value.replace(/\D/g, ""))} placeholder="Views mín." aria-label="Views mínimas" />
      </div>
      <div className="space-y-2">
        {list.length === 0 ? <Empty>Nenhum gancho salvo ainda.</Empty> : list.map((h) => (
          <HookRow key={h.id} h={h} formula={name(h.formula_id)} onUse={() => use(h)} onDelete={() => remove.mutate(h.id)} />
        ))}
      </div>
      <details className="rounded-lg border bg-card p-3">
        <summary className="cursor-pointer text-sm font-medium">As 26 fórmulas</summary>
        <ol className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
          {formulas.map((x) => <li key={x.id}><strong>{x.id}. {x.name}:</strong> <span className="text-muted-foreground">{x.template}</span></li>)}
        </ol>
      </details>
    </div>
  );
}
