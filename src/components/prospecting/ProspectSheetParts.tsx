import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Copy, ExternalLink, Globe, MapPin, Phone, Save, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProspectActions } from "@/hooks/useProspects";
import type { Prospect, ProspectCampaign } from "@/integrations/supabase/types";
import { PROSPECT_PRIORITIES, PROSPECT_STATUS, PROSPECT_TEMPS, STATUS_TONE, copyText, opportunity, siteUrl, tempOf } from "@/lib/prospecting";
import { cn } from "@/lib/utils";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-2" aria-label={title}><p className="brand-eyebrow">{title}</p>{children}</section>;
}

export function Badges({ p }: { p: Prospect }) {
  const opp = opportunity(p.score);
  const temp = tempOf(p.temperature);
  const pill = "rounded-full px-2 py-0.5 text-[11px] font-medium";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={cn(pill, STATUS_TONE[p.status])}>{p.status}</span>
      {temp && <span className={cn(pill, temp.tone)}>{temp.label}</span>}
      <span className={cn(pill, opp.tone)}>Oportunidade {p.score ?? "—"}</span>
      {p.rating != null && <span className="inline-flex items-center gap-1 text-xs"><Star className="size-3.5 fill-warning text-warning" />{Number(p.rating).toFixed(1)} ({p.reviews_count ?? 0})</span>}
    </div>
  );
}

function Pick({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

/** Status, temperatura, prioridade e campanha (salvam na hora). */
export function Pickers({ p, campaigns }: { p: Prospect; campaigns: ProspectCampaign[] }) {
  const { record, patch } = useProspectActions();
  const set = (field: "status" | "temperature" | "priority", v: string, label: string) =>
    record.mutate({ p, kind: `${label}: ${v}`, values: { [field]: v } });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Pick id="ps-status" label="Status" value={p.status} options={PROSPECT_STATUS.map((s) => ({ value: s, label: s }))} onChange={(v) => set("status", v, "Status")} />
        <Pick id="ps-temp" label="Temperatura" value={p.temperature ?? "frio"} options={PROSPECT_TEMPS.map((t) => ({ value: t.value, label: t.label }))} onChange={(v) => set("temperature", v, "Temperatura")} />
        <Pick id="ps-prio" label="Prioridade" value={p.priority ?? "normal"} options={PROSPECT_PRIORITIES.map((t) => ({ value: t.value, label: t.label }))} onChange={(v) => set("priority", v, "Prioridade")} />
      </div>
      <Pick id="ps-camp" label="Campanha vinculada" value={p.campaign_id ?? "none"}
        options={[{ value: "none", label: "Sem campanha" }, ...campaigns.map((c) => ({ value: c.id, label: c.name }))]}
        onChange={(v) => patch.mutate({ id: p.id, values: { campaign_id: v === "none" ? null : v } })} />
    </div>
  );
}

function Line({ icon, children, copy, what }: { icon: ReactNode; children: ReactNode; copy?: string | null; what?: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
      {copy && <Button size="icon" variant="ghost" className="size-7" aria-label={`Copiar ${what}`} onClick={() => void copyText(copy, what ?? "Texto")}><Copy className="size-3.5" /></Button>}
    </div>
  );
}

export function ContactLines({ p }: { p: Prospect }) {
  const phone = p.phone ?? p.whatsapp;
  return (
    <div className="space-y-1.5">
      {p.address && <Line icon={<MapPin className="size-4" />} copy={p.address} what="Endereço">{p.address}</Line>}
      <Line icon={<Phone className="size-4" />} copy={phone} what="Telefone">{phone ?? <span className="text-muted-foreground">Não informado</span>}</Line>
      <Line icon={<Globe className="size-4" />} copy={p.website} what="Site">
        {p.website ? <a href={siteUrl(p.website)} target="_blank" rel="noreferrer" className="text-primary hover:underline">{p.website}</a> : <span className="font-medium text-success">Sem site</span>}
      </Line>
      {[p.instagram, p.facebook, p.linkedin].filter(Boolean).map((u) => (
        <Line key={u} icon={<ExternalLink className="size-4" />}><a href={siteUrl(u as string)} target="_blank" rel="noreferrer" className="text-primary hover:underline">{u}</a></Line>
      ))}
    </div>
  );
}

export function NotesBox({ p }: { p: Prospect }) {
  const { record } = useProspectActions();
  const [v, setV] = useState(p.notes ?? "");
  useEffect(() => setV(p.notes ?? ""), [p.id, p.notes]);
  const dirty = v !== (p.notes ?? "");
  return (
    <div className="space-y-1.5">
      <Label htmlFor="ps-notes" className="text-xs">Observações internas</Label>
      <Textarea id="ps-notes" rows={3} value={v} onChange={(e) => setV(e.target.value)} placeholder="Anotações, oportunidade principal, serviço recomendado…" />
      <div className="flex justify-end">
        <Button size="sm" variant="outline" disabled={!dirty || record.isPending} onClick={() => record.mutate({ p, kind: "Observação atualizada", values: { notes: v.trim() || null } })}><Save className="size-4" />Salvar observação</Button>
      </div>
    </div>
  );
}

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function History({ p }: { p: Prospect }) {
  const list = [...(p.approach_history ?? []), { at: p.created_at, kind: "Prospect criado", note: null }];
  return (
    <ol className="space-y-1 text-sm" aria-label="Histórico do prospect">
      {list.slice(0, 30).map((e, i) => (
        <li key={`${e.at}-${i}`} className="flex justify-between gap-3">
          <span className="min-w-0">{e.kind}{e.note && <span className="block text-xs text-muted-foreground">{e.note}</span>}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{when(e.at)}</span>
        </li>
      ))}
    </ol>
  );
}

export function Origin({ p }: { p: Prospect }) {
  const raw = (p.raw_data ?? {}) as Record<string, unknown>;
  const rows: [string, string | null][] = [
    ["Fonte", p.source], ["Extraído em", when(p.created_at)], ["Busca", p.search_id], ["Place ID", p.place_id],
    ["Enriquecido em", p.enriched_at ? when(p.enriched_at) : null], ["Categoria no Maps", (raw.categoryName as string) ?? null],
  ];
  return (
    <dl className="grid grid-cols-[110px_1fr] gap-x-2 gap-y-1 rounded-md bg-muted/50 p-2.5 text-xs">
      {rows.filter(([, v]) => v).map(([k, v]) => <Fragment key={k}><dt className="text-muted-foreground">{k}</dt><dd className="truncate font-mono">{v}</dd></Fragment>)}
    </dl>
  );
}
