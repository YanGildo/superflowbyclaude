import { useState } from "react";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFormulas, useMetrics, useSaveMetric } from "@/hooks/useContent";
import { useContentItems } from "@/hooks/useMarketing";
import type { ContentItem, ContentMetric } from "@/integrations/supabase/types";
import { fmtNum, latestByItem, median, promptRelatorio } from "@/lib/content";
import { localISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Choice, CopyPrompt, Empty, Field } from "./ContentBits";

const FIELDS = [
  { key: "views", label: "Views" }, { key: "reach", label: "Alcance" }, { key: "non_follower_pct", label: "% não seguidores" },
  { key: "retention3s", label: "Retenção 3s (%)" }, { key: "saves", label: "Salvamentos" }, { key: "shares", label: "Compartilh." },
  { key: "comments", label: "Comentários" }, { key: "follows", label: "Seguidores ganhos" }, { key: "dms", label: "DMs" },
] as const;
type MetricKey = (typeof FIELDS)[number]["key"];
const ago = (d: number) => localISODate(new Date(Date.now() - d * 86400000));

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="h-8" />;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - (v / max) * 28}`).join(" ");
  return <svg viewBox="0 0 100 32" className="h-8 w-full" preserveAspectRatio="none" aria-hidden><polyline points={pts} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>;
}

function MetricForm({ items }: { items: ContentItem[] }) {
  const saveM = useSaveMetric();
  const [item, setItem] = useState("");
  const [date, setDate] = useState(localISODate());
  const [v, setV] = useState<Record<string, string>>({});
  const submit = () => {
    const vals = Object.fromEntries(FIELDS.map((f) => [f.key, v[f.key]?.trim() ? Number(v[f.key].replace(",", ".")) : null]));
    saveM.mutate({ item_id: item, measured_on: date, ...vals }, { onSuccess: () => setV({}) });
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Lançar métricas de um post</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
          <Field id="mt-item" label="Post"><Choice id="mt-item" value={item} onChange={setItem} placeholder="Escolha a peça" options={items.map((c) => ({ value: c.id, label: c.title }))} /></Field>
          <Field id="mt-date" label="Data da medição"><Input id="mt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {FIELDS.map((f) => <Field key={f.key} id={`mt-${f.key}`} label={f.label}><Input id={`mt-${f.key}`} inputMode="decimal" value={v[f.key] ?? ""} onChange={(e) => setV((x) => ({ ...x, [f.key]: e.target.value }))} /></Field>)}
        </div>
        <Button onClick={submit} disabled={!item || saveM.isPending}>Salvar métricas</Button>
      </CardContent>
    </Card>
  );
}

function Highlight({ m, item, med }: { m: ContentMetric; item?: ContentItem; med: number }) {
  const saveM = useSaveMetric();
  const [note, setNote] = useState(m.note ?? "");
  return (
    <li className="space-y-1 rounded-lg border p-2.5">
      <p className="flex items-center gap-2 text-sm font-medium"><Flame className="size-4 text-destructive" />{item?.title ?? "(peça removida)"}<span className="ml-auto text-xs text-muted-foreground">{fmtNum(m.views)} views · {(Number(m.views) / med).toFixed(1)}x</span></p>
      <Input value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (m.note ?? "") && saveM.mutate({ item_id: m.item_id, measured_on: m.measured_on, note })} placeholder="Por que estourou? (1 linha)" aria-label={`Por que ${item?.title} estourou`} className="h-8" />
    </li>
  );
}

/** Análise: entrada manual por post (até ligar a Zernio), medianas, destaques e fórmulas que mais performam. */
export function AnalysisTab() {
  const { data: metrics = [] } = useMetrics();
  const { data: items = [] } = useContentItems();
  const { data: formulas = [] } = useFormulas();
  const [days, setDays] = useState(30);
  const latest = [...latestByItem(metrics).values()];
  const inWindow = (d: number) => metrics.filter((m) => m.measured_on >= ago(d));
  const sum = (list: ContentMetric[], k: MetricKey) => list.reduce((a, m) => a + Number(m[k] ?? 0), 0);
  const med = median(latest.filter((m) => m.measured_on >= ago(30) && m.views != null).map((m) => Number(m.views)));
  const heaters = latest.filter((m) => med && Number(m.views) >= 2 * med).sort((a, b) => Number(b.views) - Number(a.views)).slice(0, 5);
  const itemOf = (id: string) => items.find((c) => c.id === id);
  const byFormula = formulas.map((f) => {
    const ms = latest.filter((m) => itemOf(m.item_id)?.hook_formula_id === f.id && m.views != null);
    return { f, n: ms.length, avg: ms.length ? sum(ms, "views") / ms.length : 0 };
  }).filter((x) => x.n).sort((a, b) => b.avg - a.avg);
  const weekRows = latest.filter((m) => m.measured_on >= ago(7)).map((m) => ({ title: itemOf(m.item_id)?.title ?? "", kind: itemOf(m.item_id)?.kind ?? "", formula: formulas.find((f) => f.id === itemOf(m.item_id)?.hook_formula_id)?.name ?? "", m }));
  const win = inWindow(days);
  const series = (k: MetricKey) => [...new Set(win.map((m) => m.measured_on))].sort().map((d) => sum(win.filter((m) => m.measured_on === d), k));

  return (
    <div className="space-y-4">
      <MetricForm items={items.filter((c) => c.stage !== "ideia")} />
      <div className="flex flex-wrap items-center gap-2">
        {[7, 30, 90].map((d) => <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>{d} dias</Button>)}
        <span className="text-sm text-muted-foreground">Mediana de views (30 dias): <strong>{fmtNum(Math.round(med))}</strong></span>
        <div className="ml-auto"><CopyPrompt text={() => promptRelatorio(weekRows)} label="Copiar relatório pro Claude (Etapa 6)" /></div>
      </div>
      {metrics.length === 0 ? <Empty>Sem métricas ainda. Lance as do primeiro post acima.</Empty> : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {FIELDS.filter((f) => !["non_follower_pct", "retention3s", "reach", "dms"].includes(f.key)).map((f) => (
            <Card key={f.key}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{f.label}</p><p className="font-heading text-xl font-semibold">{fmtNum(sum(win, f.key))}</p><Spark values={series(f.key)} /></CardContent></Card>
          ))}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Destaques (2x a mediana ou mais)</CardTitle></CardHeader>
          <CardContent>{heaters.length ? <ul className="space-y-2">{heaters.map((m) => <Highlight key={m.id} m={m} item={itemOf(m.item_id)} med={med} />)}</ul> : <p className="text-sm text-muted-foreground">Nenhum destaque ainda.</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Fórmulas que mais performam</CardTitle></CardHeader>
          <CardContent>{byFormula.length ? (
            <ul className="space-y-1 text-sm">{byFormula.map((x, i) => (
              <li key={x.f.id} className={cn("flex justify-between gap-2", i === 0 && "font-semibold")}><span>{x.f.id}. {x.f.name}</span><span className="text-muted-foreground">{fmtNum(Math.round(x.avg))} views médias · {x.n} post(s)</span></li>
            ))}</ul>
          ) : <p className="text-sm text-muted-foreground">Ligue a fórmula do gancho nas peças para ver aqui.</p>}</CardContent>
        </Card>
      </div>
    </div>
  );
}
