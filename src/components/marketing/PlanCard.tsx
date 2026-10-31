import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMarketingPlan, useSavePlan } from "@/hooks/useMarketing";
import { currentYM, monthLabel, shiftMonth } from "@/lib/format";
import { MKT_CHANNELS } from "@/lib/marketing";
import { cn } from "@/lib/utils";
import { AreaField } from "./FormShell";

type Plan = { goal: string; audience: string; offer: string; channels: string[]; notes: string };
const EMPTY: Plan = { goal: "", audience: "", offer: "", channels: [], notes: "" };
const orNull = (v: string) => (v.trim() ? v.trim() : null);

export function ChannelChips({ value, onToggle }: { value: string[]; onToggle?: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Canais">
      {MKT_CHANNELS.map((c) => {
        const on = value.includes(c);
        return (
          <button key={c} type="button" aria-pressed={on} disabled={!onToggle} onClick={() => onToggle?.(c)}
            className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-primary/50 hover:text-foreground")}>
            {c}
          </button>
        );
      })}
    </div>
  );
}

/** Plano de Marketing do mês: objetivo, público, oferta, canais e observações. */
export function PlanCard() {
  const [ym, setYm] = useState(currentYM());
  const { data: plan } = useMarketingPlan(ym);
  const save = useSavePlan();
  const [f, setF] = useState<Plan>(EMPTY);

  useEffect(() => {
    setF(plan ? { goal: plan.goal ?? "", audience: plan.audience ?? "", offer: plan.offer ?? "", channels: plan.channels ?? [], notes: plan.notes ?? "" } : EMPTY);
  }, [plan, ym]);

  const set = (k: keyof Plan, v: string) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (c: string) => setF((p) => ({ ...p, channels: p.channels.includes(c) ? p.channels.filter((x) => x !== c) : [...p.channels, c] }));
  const submit = () => save.mutate({
    id: plan?.id, month: ym,
    values: { goal: orNull(f.goal), audience: orNull(f.audience), offer: orNull(f.offer), channels: f.channels, notes: orNull(f.notes) },
  });

  return (
    <Card className="space-y-3 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-heading font-semibold">Plano de Marketing do mês</h3>
          <p className="text-xs text-muted-foreground">O norte do mês: o que vender, para quem e onde.</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Mês anterior do plano" onClick={() => setYm(shiftMonth(ym, -1))}><ChevronLeft className="size-4" /></Button>
          <span className="min-w-32 text-center text-sm font-medium">{monthLabel(ym)}</span>
          <Button variant="ghost" size="icon" aria-label="Próximo mês do plano" onClick={() => setYm(shiftMonth(ym, 1))}><ChevronRight className="size-4" /></Button>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <AreaField id="plan-goal" wide={false} label="Objetivo" value={f.goal} onChange={(v) => set("goal", v)} placeholder="Ex.: 30 leads do ensaio com IA" />
        <AreaField id="plan-aud" wide={false} label="Público" value={f.audience} onChange={(v) => set("audience", v)} placeholder="Ex.: mulheres 25-40, Brasil e Portugal" />
        <AreaField id="plan-offer" wide={false} label="Oferta" value={f.offer} onChange={(v) => set("offer", v)} placeholder="Ex.: pacote de 20 fotos por R$ 97" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Canais</p>
        <ChannelChips value={f.channels} onToggle={toggle} />
      </div>
      <AreaField id="plan-notes" label="Observações" value={f.notes} onChange={(v) => set("notes", v)} />
      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}Salvar plano</Button>
      </div>
    </Card>
  );
}
