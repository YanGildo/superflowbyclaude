import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePlanCheckins, useSaveCheckin } from "@/hooks/useActionPlans";
import type { ActionPlanCheckin } from "@/integrations/supabase/types";
import { METRICS, weekRates, weekStart } from "@/lib/actionPlans";
import { brl, parseMoney } from "@/lib/format";
import { shortDate } from "@/lib/labels";

const eur = (n: number) => brl(n).replace("R$", "€");
const show = (v: number | null | undefined, money?: boolean) => (v == null ? "—" : money ? eur(v) : String(v));

function WeekForm({ planId, current }: { planId: string; current: ActionPlanCheckin | undefined }) {
  const save = useSaveCheckin();
  const [week, setWeek] = useState(weekStart());
  const [vals, setVals] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  useEffect(() => {
    setVals(Object.fromEntries(METRICS.map((m) => [m.key, current?.values[m.key] != null ? String(current.values[m.key]).replace(".", ",") : ""])));
    setNotes(current?.notes ?? "");
  }, [current]);
  const submit = () => save.mutate({
    plan_id: planId, week_start: weekStart(week), notes: notes.trim() || null,
    values: Object.fromEntries(METRICS.map((m) => [m.key, vals[m.key]?.trim() ? parseMoney(vals[m.key]) : null])),
  });
  return (
    <Card><CardContent className="space-y-3 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5"><Label htmlFor="ck-week">Semana de</Label><Input id="ck-week" type="date" value={week} onChange={(e) => setWeek(e.target.value)} className="w-40" /></div>
        <p className="pb-2 text-xs text-muted-foreground">Preencha toda sexta. A semana começa na segunda ({shortDate(weekStart(week))}).</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.key} className="grid gap-1.5"><Label htmlFor={`ck-${m.key}`} className="text-xs">{m.label}</Label>
            <Input id={`ck-${m.key}`} inputMode="decimal" value={vals[m.key] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [m.key]: e.target.value }))} /></div>
        ))}
      </div>
      <Textarea rows={2} placeholder="O que funcionou, o que mudar na próxima semana" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Observações da semana" />
      <div className="flex justify-end"><Button onClick={submit} disabled={save.isPending}>Salvar semana</Button></div>
    </CardContent></Card>
  );
}

/** Números da semana do plano: contatos, respostas, demos, propostas, vendas e €. */
export function CheckinsTab({ planId }: { planId: string }) {
  const { data: list = [] } = usePlanCheckins(planId);
  const thisWeek = list.find((c) => c.week_start === weekStart());
  return (
    <div className="space-y-4">
      <WeekForm planId={planId} current={thisWeek} />
      {list.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-card" aria-label="Histórico semanal">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="p-2">Semana</th>{METRICS.map((m) => <th key={m.key} className="p-2">{m.label}</th>)}<th className="p-2">Resposta</th><th className="p-2">Fechamento</th>
            </tr></thead>
            <tbody>{list.map((c) => {
              const r = weekRates(c.values);
              return (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-2 font-medium">{shortDate(c.week_start)}</td>
                  {METRICS.map((m) => <td key={m.key} className="p-2 tabular-nums">{show(c.values[m.key], m.money)}</td>)}
                  <td className="p-2 tabular-nums">{r.resposta != null ? `${r.resposta}%` : "—"}</td>
                  <td className="p-2 tabular-nums">{r.fechamento != null ? `${r.fechamento}%` : "—"}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
