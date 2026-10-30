import { useMemo, useState } from "react";
import { MessageSquare, Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivities, useContacts, useCrmMutations } from "@/hooks/useCrm";
import type { Activity } from "@/integrations/supabase/types";
import { ACTIVITY_STATUS, CONTACT_TYPES, CONVERSION_TYPES } from "@/lib/crm";
import { EMPTY_FILTER, contactKpis, conversionKpis, matchesActivity, type Kpi } from "@/lib/activityFilters";
import { brl, currentYM } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ActivityDialog } from "./ActivityDialog";
import { ActivityFilters } from "./ActivityFilters";

const CONFIG = {
  conversao: {
    title: "Conversões", hint: "Eventos comerciais importantes: leads, propostas, fechamentos, upsell. Os principais são registrados sozinhos.",
    add: "Nova conversão", empty: "Nenhuma conversão registrada ainda. Crie manualmente ou adicione leads no pipeline.", types: CONVERSION_TYPES, icon: Trophy,
  },
  contato: {
    title: "Registro de Contatos", hint: "Histórico comercial de leads e clientes: mensagens, ligações, reuniões e follow-ups.",
    add: "Novo registro", empty: "Nenhum registro encontrado. Registre contatos aqui ou pela ficha do lead.", types: CONTACT_TYPES, icon: MessageSquare,
  },
} as const;

function KpiRow({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", kpis.length > 4 ? "lg:grid-cols-6" : "lg:grid-cols-4")}>
      {kpis.map((k) => (
        <Card key={k.label}><CardContent className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{k.label}</p>
          <p className={cn("mt-1 font-heading text-xl font-semibold tabular-nums", k.tone)}>{k.money ? brl(Number(k.value)) : k.value}</p>
        </CardContent></Card>
      ))}
    </div>
  );
}

function ActivityRow({ a, contactName, onEdit }: { a: Activity; contactName?: string; onEdit: () => void }) {
  const { remove } = useCrmMutations("activities");
  const st = a.outcome ? ACTIVITY_STATUS[a.outcome] : undefined;
  return (
    <div className="group flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-2.5">
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{a.type}{contactName && <span className="font-normal text-muted-foreground"> · {contactName}</span>}</p>
        <p className="truncate text-xs text-muted-foreground">
          {new Date(a.at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          {a.channel && ` · ${a.channel}`}{a.summary && ` · ${a.summary}`}{a.origin === "automatico" && " · automático"}
        </p>
      </button>
      {a.value != null && <span className="font-heading text-sm font-semibold">{brl(Number(a.value))}</span>}
      {st && a.category === "contato" && <span className={cn("text-xs font-medium", st.tone)}>{st.label}</span>}
      <Button size="sm" variant="ghost" className="text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100" onClick={() => remove.mutate(a.id)}>Excluir</Button>
    </div>
  );
}

export function ActivityLogTab({ category }: { category: Activity["category"] }) {
  const cfg = CONFIG[category];
  const { data: items = [], isLoading } = useActivities(category);
  const { data: contacts = [] } = useContacts();
  const [f, setF] = useState(EMPTY_FILTER);
  const [dialog, setDialog] = useState<{ open: boolean; a?: Activity | null }>({ open: false });
  const names = useMemo(() => new Map(contacts.map((c) => [c.id, c.name])), [contacts]);
  const list = items.filter((a) => matchesActivity(a, f));
  const kpis = category === "conversao" ? conversionKpis(items, currentYM()) : contactKpis(list);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold">{cfg.title}</h2>
          <p className="text-sm text-muted-foreground">{cfg.hint}</p>
        </div>
        <Button onClick={() => setDialog({ open: true, a: null })}><Plus className="size-4" />{cfg.add}</Button>
      </div>
      <KpiRow kpis={kpis} />
      <ActivityFilters f={f} setF={setF} types={[...cfg.types]} withCampaign={category === "conversao"} withStatus={category === "contato"} />
      {isLoading ? <Skeleton className="h-32 rounded-xl" /> : list.length === 0 ? (
        <div className="rounded-xl border bg-card px-6 py-10 text-center text-sm text-muted-foreground">{cfg.empty}</div>
      ) : (
        <div className="space-y-1.5">
          {list.map((a) => <ActivityRow key={a.id} a={a} contactName={a.contact_id ? names.get(a.contact_id) : undefined} onEdit={() => setDialog({ open: true, a })} />)}
        </div>
      )}
      <ActivityDialog open={dialog.open} activity={dialog.a} category={category} defaultType={category === "contato" ? "Mensagem" : ""}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />
    </div>
  );
}
