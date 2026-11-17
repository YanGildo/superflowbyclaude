import { FormDialog } from "@/components/personal/FormDialog";
import { useCrmMutations } from "@/hooks/useCrm";
import type { TtsDay } from "@/integrations/supabase/types";
import { todayISO } from "@/lib/tiktokShop";
import type { Field } from "@/lib/formFields";

const FIELDS: Field[] = [
  { key: "day", label: "Dia", type: "date", required: true },
  { key: "videos_posted", label: "Vídeos postados", type: "number", half: true },
  { key: "lives", label: "Lives", type: "number", half: true },
  { key: "live_minutes", label: "Minutos de live", type: "number", half: true },
  { key: "orders", label: "Vendas (pedidos)", type: "number", half: true },
  { key: "gmv", label: "Vendido (GMV, R$)", type: "number", half: true, help: "Total vendido pelos seus links." },
  { key: "commission", label: "Comissão (R$)", type: "number", half: true, help: "O que você ganhou no dia." },
  { key: "notes", label: "Observações", type: "textarea", rows: 2, placeholder: "O que funcionou, produto que puxou, ideia para amanhã…" },
];

/** Lançar o resultado de um dia (se o dia já existe, atualiza). */
export function TtsDayDialog({ open, onOpenChange, day, days }: {
  open: boolean; onOpenChange: (o: boolean) => void; day: TtsDay | null; days: TtsDay[];
}) {
  const m = useCrmMutations("tts_days");
  const initial = day ?? { day: todayISO() };
  const save = async (v: Record<string, unknown>) => {
    const zero = (k: string) => (v[k] as number | null) ?? 0;
    const row = {
      day: v.day, notes: v.notes, videos_posted: zero("videos_posted"), lives: zero("lives"), live_minutes: zero("live_minutes"),
      orders: zero("orders"), gmv: zero("gmv"), commission: zero("commission"),
    };
    const existing = day ?? days.find((d) => d.day === v.day);
    await m.save.mutateAsync(existing ? { id: existing.id, ...row } : row);
  };
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={day ? "Editar dia" : "Lançar o dia"}
      description="Copie os números do TikTok Shop (Central do afiliado / Análise). Leva 1 minuto." fields={FIELDS}
      initial={initial} onSubmit={save} pending={m.save.isPending} onDelete={day ? () => m.remove.mutate(day.id) : undefined} />
  );
}
