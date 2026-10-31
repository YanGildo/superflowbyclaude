import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPinOff } from "lucide-react";
import { useProspects } from "@/hooks/useProspects";
import type { Prospect } from "@/integrations/supabase/types";
import { STATUS_TONE, opportunity } from "@/lib/prospecting";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "todos", label: "Todos", test: () => true },
  { id: "abordar", label: "Para abordar", test: (p: Prospect) => p.status === "Para abordar" },
  { id: "novos", label: "Novos", test: (p: Prospect) => p.status === "Novo" },
  { id: "alta", label: "Oportunidade alta", test: (p: Prospect) => (p.score ?? 0) >= 70 },
  { id: "lead", label: "Viraram lead", test: (p: Prospect) => p.status === "Virou lead" },
];

const color = (p: Prospect) => ((p.score ?? 0) >= 70 ? "#10B981" : (p.score ?? 0) >= 50 ? "#F59E0B" : "#0D47A1");

/** Centraliza o mapa no prospect escolhido na lista. */
function FlyTo({ target }: { target: Prospect | null }) {
  const map = useMap();
  useEffect(() => {
    if (target?.latitude != null && target.longitude != null) map.flyTo([target.latitude, target.longitude], 15, { duration: 0.8 });
  }, [target, map]);
  return null;
}

function SideList({ list, filter, setFilter, all, onPick }: {
  list: Prospect[]; filter: string; setFilter: (f: string) => void; all: Prospect[]; onPick: (p: Prospect) => void;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
            className={cn("rounded-md px-2 py-1 text-[11px] font-medium", filter === f.id ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-accent")}>
            {f.label} ({all.filter(f.test).length})
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {list.map((p) => (
          <button key={p.id} type="button" onClick={() => onPick(p)} className="w-full rounded-lg border bg-card px-3 py-2 text-left hover:border-primary/40">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <span className={cn("shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium", STATUS_TONE[p.status])}>{p.status}</span>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">{[p.city, p.category].filter(Boolean).join(" · ")}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function MapTab() {
  const { data: prospects = [] } = useProspects();
  const [filter, setFilter] = useState("todos");
  const [target, setTarget] = useState<Prospect | null>(null);
  const located = prospects.filter((p) => p.latitude != null && p.longitude != null);
  const rule = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const list = located.filter(rule.test);
  const first = list[0];

  if (located.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card py-16 text-center text-sm text-muted-foreground">
        <MapPinOff className="size-6" />Nenhum prospect com localização ainda. As buscas da Apify trazem o ponto no mapa.
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-17rem)] min-h-[480px] gap-3 lg:grid-cols-[300px_1fr]">
      <SideList list={list} filter={filter} setFilter={setFilter} all={located} onPick={setTarget} />
      <div className="overflow-hidden rounded-xl border">
        <MapContainer center={first ? [first.latitude as number, first.longitude as number] : [-15, -50]} zoom={first ? 11 : 4} className="h-full w-full">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {list.map((p) => (
            <CircleMarker key={p.id} center={[p.latitude as number, p.longitude as number]} radius={7} pathOptions={{ color: "#fff", weight: 2, fillColor: color(p), fillOpacity: 0.95 }}>
              <Popup>
                <b>{p.name}</b><br />{p.category ?? ""}<br />{p.phone ?? "sem telefone"}<br />
                Oportunidade {opportunity(p.score).label} ({p.score ?? "—"}) · {p.status}
                {p.maps_url && <><br /><a href={p.maps_url} target="_blank" rel="noreferrer">Abrir no Maps</a></>}
              </Popup>
            </CircleMarker>
          ))}
          <FlyTo target={target} />
        </MapContainer>
      </div>
    </div>
  );
}
