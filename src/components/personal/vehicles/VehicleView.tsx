import { useState } from "react";
import { CalendarClock, Gauge, History, Phone, Plus, Search, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common/PageHeader";
import { Stat } from "@/components/personal/Bits";
import type { Vehicle, VehicleService } from "@/integrations/supabase/types";
import { brl } from "@/lib/format";
import { dmy } from "@/lib/formFields";
import { CATEGORY_LABEL, itemTotal, searchHistory, upcoming, vehicleStats } from "@/lib/vehicles";
import { ServiceDialog } from "./ServiceDialog";

const ago = (d: number) => (d <= 0 ? "hoje" : d < 31 ? `há ${d} dia(s)` : d < 365 ? `há ${Math.round(d / 30)} mês(es)` : `há ${(d / 365).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ano(s)`);

/** "Quando troquei o amortecedor?": procura em todas as ordens de serviço. */
function HistorySearch({ services }: { services: VehicleService[] }) {
  const [term, setTerm] = useState("");
  const hits = searchHistory(services, term);
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium"><History className="size-4" />Última vez que fez</p>
      <div className="relative"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Ex.: amortecedor, pastilha, óleo, alinhamento" className="pl-8" aria-label="Procurar no histórico" /></div>
      {term.trim().length >= 2 && (hits.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nada encontrado no histórico.</p> : (
        <ul className="mt-2 divide-y text-sm" aria-label="Resultado do histórico">
          {hits.map((h, i) => (
            <li key={i} className="flex flex-wrap justify-between gap-2 py-1.5">
              <span><b>{h.item?.desc ?? CATEGORY_LABEL[h.service.category]}</b> · {dmy(h.service.date)} ({ago(h.daysAgo)}){h.service.km ? ` · ${h.service.km.toLocaleString("pt-BR")} km` : ""} · {h.service.shop ?? "—"}</span>
              <span className="text-muted-foreground">{h.item ? `${h.item.qty} × ${brl(Number(h.item.unit))} = ${brl(itemTotal(h.item))}` : brl(Number(h.service.total))}</span>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

function ServiceCard({ s, onOpen }: { s: VehicleService; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="w-full rounded-xl border bg-card p-3 text-left hover:border-primary/50">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{s.shop ?? CATEGORY_LABEL[s.category]} <span className="text-sm font-normal text-muted-foreground">· {dmy(s.date)}{s.km ? ` · ${s.km.toLocaleString("pt-BR")} km` : ""}</span></p>
          <p className="text-xs text-muted-foreground">{CATEGORY_LABEL[s.category]}{s.os_number ? ` · ${s.os_number}` : ""}{s.to_finance ? " · no Financeiro" : ""}</p>
        </div>
        <p className="font-heading text-lg font-semibold">{brl(Number(s.total))}</p>
      </div>
      {s.items.length > 0 && (
        <ul className="mt-2 grid gap-x-4 text-sm sm:grid-cols-2">
          {s.items.map((i, k) => <li key={k} className="flex justify-between gap-2 border-b border-dashed py-0.5"><span className="truncate">{i.qty > 1 ? `${i.qty}× ` : ""}{i.desc}</span><span className="text-muted-foreground">{brl(itemTotal(i))}</span></li>)}
        </ul>
      )}
      {s.notes && <p className="mt-1.5 text-xs text-muted-foreground">{s.notes}</p>}
      {s.shop_phone && <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><Phone className="size-3" />{s.shop_phone}</p>}
    </button>
  );
}

/** Um veículo: números, próximas revisões, busca no histórico e a linha do tempo de gastos. */
export function VehicleView({ vehicle, services }: { vehicle: Vehicle; services: VehicleService[] }) {
  const [edit, setEdit] = useState<VehicleService | null | "new">(null);
  const mine = services.filter((s) => s.vehicle_id === vehicle.id);
  const st = vehicleStats(vehicle, services);
  const next = upcoming(vehicle, services).slice(0, 3);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Wrench} label="Gasto no ano" value={brl(st.year)} hint={`${brl(st.last12)} nos últimos 12 meses`} />
        <Stat label="Gasto total registrado" value={brl(st.total)} hint={`${st.count} registro(s)`} />
        <Stat icon={Gauge} label="Km atual" value={vehicle.current_km ? vehicle.current_km.toLocaleString("pt-BR") : "—"} hint="Atualiza sozinho quando você informa o km do serviço" />
        <Stat icon={CalendarClock} label="Última ida" value={st.last ? dmy(st.last.date) : "—"} hint={st.last ? `${st.last.shop ?? CATEGORY_LABEL[st.last.category]} · ${brl(Number(st.last.total))}` : "Nenhum registro"} />
      </div>
      {(next.length > 0 || st.byCategory.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {next.map(({ s, kmLeft }) => <Badge key={s.id} variant="outline" className="border-warning/50">Próxima: {s.next_date ? dmy(s.next_date) : ""}{s.next_km ? ` ${s.next_km.toLocaleString("pt-BR")} km` : ""}{kmLeft != null ? ` (faltam ${kmLeft.toLocaleString("pt-BR")} km)` : ""}</Badge>)}
          {st.byCategory.map(([c, v]) => <Badge key={c} variant="secondary">{CATEGORY_LABEL[c as keyof typeof CATEGORY_LABEL]}: {brl(v)}</Badge>)}
        </div>
      )}
      <HistorySearch services={mine} />
      <div className="flex items-center justify-between">
        <p className="font-heading font-semibold">Histórico</p>
        <Button onClick={() => setEdit("new")}><Plus className="size-4" />Registrar gasto</Button>
      </div>
      {mine.length === 0 ? <EmptyState icon={Wrench} title="Nenhum gasto registrado" description="Cada ida ao mecânico com as peças e valores. Na próxima, você vê o que foi feito e quanto custou." />
        : <div className="space-y-2">{mine.map((s) => <ServiceCard key={s.id} s={s} onOpen={() => setEdit(s)} />)}</div>}
      <ServiceDialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)} vehicle={vehicle} service={edit === "new" ? null : edit} />
    </div>
  );
}
