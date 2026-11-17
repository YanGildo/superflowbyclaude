import { useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/PageHeader";
import { FormDialog } from "@/components/personal/FormDialog";
import { useTtsDays, useTtsSettings } from "@/hooks/usePersonal";
import type { TtsDay } from "@/integrations/supabase/types";
import { brl } from "@/lib/format";
import { dmy, type Field } from "@/lib/formFields";
import { TTS_DEFAULTS } from "@/lib/tiktokShop";
import { TtsDayDialog } from "./TtsDayDialog";

/** Diário: um lançamento por dia, com totais do mês. */
export function TtsDiary() {
  const days = useTtsDays().data ?? [];
  const [edit, setEdit] = useState<TtsDay | null | "new">(null);
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={() => setEdit("new")}><Plus className="size-4" />Lançar dia</Button></div>
      {days.length === 0 ? <EmptyState icon={CalendarDays} title="Nenhum dia lançado" description="Todo fim de dia, anote vídeos, lives, vendas e comissão. É isso que alimenta o painel." /> : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm" aria-label="Diário do TikTok Shop">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr><th className="px-3 py-2">Dia</th><th className="px-3 py-2">Vídeos</th><th className="px-3 py-2">Lives</th><th className="px-3 py-2">Vendas</th><th className="px-3 py-2">Vendido</th><th className="px-3 py-2">Comissão</th><th className="px-3 py-2">Notas</th></tr>
            </thead>
            <tbody className="divide-y">
              {days.map((d) => (
                <tr key={d.id} className="cursor-pointer hover:bg-accent/40" onClick={() => setEdit(d)}>
                  <td className="px-3 py-2 font-medium">{dmy(d.day)}</td><td className="px-3 py-2">{d.videos_posted}</td>
                  <td className="px-3 py-2">{d.lives}{d.live_minutes ? ` (${d.live_minutes} min)` : ""}</td><td className="px-3 py-2">{d.orders}</td>
                  <td className="px-3 py-2">{brl(Number(d.gmv))}</td><td className="px-3 py-2 font-medium">{brl(Number(d.commission))}</td>
                  <td className="max-w-64 truncate px-3 py-2 text-muted-foreground">{d.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <TtsDayDialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)} day={edit === "new" ? null : edit} days={days} />
    </div>
  );
}

const GOAL_FIELDS: Field[] = [
  { key: "month_goal", label: "Meta de comissão no mês (R$)", type: "number", required: true },
  { key: "avg_price", label: "Preço médio dos produtos (R$)", type: "number", half: true },
  { key: "avg_commission_pct", label: "Comissão média (%)", type: "number", half: true },
  { key: "orders_per_video", label: "Vendas por vídeo (estimativa)", type: "number", half: true, help: "Depois de 10 vídeos lançados, o painel usa a sua média real." },
  { key: "videos_per_day_goal", label: "Meta de vídeos por dia", type: "number", half: true },
  { key: "lives_per_week_goal", label: "Meta de lives por semana", type: "number", half: true },
];

/** Metas: de onde sai o "quanto preciso fazer por dia". */
export function TtsGoals() {
  const { q, save } = useTtsSettings();
  const [open, setOpen] = useState(false);
  const s = q.data ?? { ...TTS_DEFAULTS, workspace_id: "" };
  const perSale = (Number(s.avg_price) * Number(s.avg_commission_pct)) / 100;
  return (
    <div className="max-w-2xl space-y-3 rounded-xl border bg-card p-5">
      <p className="font-heading text-lg font-semibold">Como o painel calcula</p>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Meta do mês: <b className="text-foreground">{brl(Number(s.month_goal))}</b> de comissão.</li>
        <li>Comissão por venda: {brl(Number(s.avg_price))} × {s.avg_commission_pct}% = <b className="text-foreground">{brl(perSale)}</b> (até você ter vendas lançadas).</li>
        <li>Vendas necessárias no mês: <b className="text-foreground">{perSale > 0 ? Math.ceil(Number(s.month_goal) / perSale) : "—"}</b>.</li>
        <li>Com {s.orders_per_video} venda(s) por vídeo: <b className="text-foreground">{Number(s.orders_per_video) > 0 && perSale > 0 ? Math.ceil(Number(s.month_goal) / perSale / Number(s.orders_per_video)) : "—"}</b> vídeos no mês.</li>
        <li>O que falta é dividido pelos dias que restam do mês, todo dia.</li>
      </ol>
      <p className="text-sm text-muted-foreground">Postagem: {s.videos_per_day_goal} vídeo(s)/dia e {s.lives_per_week_goal} live(s)/semana.</p>
      <Button onClick={() => setOpen(true)}>Editar metas</Button>
      <FormDialog open={open} onOpenChange={setOpen} title="Metas do TikTok Shop" fields={GOAL_FIELDS} initial={s}
        pending={save.isPending} onSubmit={(v) => save.mutateAsync(Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x ?? 0])))} />
    </div>
  );
}
