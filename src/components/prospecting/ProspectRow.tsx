import type { ReactNode } from "react";
import { Copy, Eye, ExternalLink, MapPin, MessageCircle, MoreHorizontal, Send, Star, Trash2, UserPlus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProspectActions } from "@/hooks/useProspects";
import type { Prospect, ProspectCampaign } from "@/integrations/supabase/types";
import { waLink } from "@/lib/crm";
import { PROSPECT_STATUS, STATUS_TONE, copyText, opportunity, priorityLabel, siteUrl, tempOf, type ProspectColumn } from "@/lib/prospecting";
import { cn } from "@/lib/utils";
import { ContactCell, IntentCell } from "./ProspectSignals";

interface RowProps { p: Prospect; campaigns: ProspectCampaign[]; onConvert: () => void; onOpen: () => void }

function RowMenu({ p, campaigns, onConvert, onOpen }: RowProps) {
  const { patch, record, remove } = useProspectActions();
  const phone = p.phone ?? p.whatsapp;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-8" aria-label={`Mais ações para ${p.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onOpen}><Eye className="mr-2 size-4" />Ver detalhes</DropdownMenuItem>
        {phone && <DropdownMenuItem onClick={() => void copyText(phone, "Telefone")}><Copy className="mr-2 size-4" />Copiar telefone</DropdownMenuItem>}
        {p.website && <DropdownMenuItem onClick={() => void copyText(p.website as string, "Site")}><Copy className="mr-2 size-4" />Copiar site</DropdownMenuItem>}
        {p.maps_url && <DropdownMenuItem asChild><a href={p.maps_url} target="_blank" rel="noreferrer"><MapPin className="mr-2 size-4" />Abrir no Google Maps</a></DropdownMenuItem>}
        {p.website && <DropdownMenuItem asChild><a href={siteUrl(p.website)} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 size-4" />Abrir site</a></DropdownMenuItem>}
        <DropdownMenuItem onClick={() => record.mutate({ p, kind: "Abordagem registrada", values: { status: "Abordado", last_approach_at: new Date().toISOString() } })}><Send className="mr-2 size-4" />Marcar abordado</DropdownMenuItem>
        {!p.converted_contact_id && <DropdownMenuItem onClick={onConvert}><UserPlus className="mr-2 size-4" />Converter em lead</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Campanha</DropdownMenuLabel>
        {campaigns.map((c) => <DropdownMenuItem key={c.id} onClick={() => patch.mutate({ id: p.id, values: { campaign_id: c.id } })}>{c.id === p.campaign_id ? "✓ " : ""}{c.name}</DropdownMenuItem>)}
        {campaigns.length === 0 && <DropdownMenuItem disabled>Nenhuma campanha</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={() => record.mutate({ p, kind: "Descartado", values: { status: "Descartado" } })}><XCircle className="mr-2 size-4" />Descartar</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={() => window.confirm(`Excluir ${p.name} de vez?`) && remove.mutate(p.id)}><Trash2 className="mr-2 size-4" />Excluir</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Rating({ p }: { p: Prospect }) {
  if (!p.rating) return <>—</>;
  return <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-warning text-warning" />{Number(p.rating).toFixed(1)} <span className="text-xs text-muted-foreground">({p.reviews_count ?? 0})</span></span>;
}

function StatusCell({ p }: { p: Prospect }) {
  const { record } = useProspectActions();
  return (
    <Select value={p.status} onValueChange={(v) => record.mutate({ p, kind: `Status: ${v}`, values: { status: v, ...(v === "Abordado" ? { last_approach_at: new Date().toISOString() } : {}) } })}>
      <SelectTrigger className={cn("h-7 w-[130px] border-0 text-xs font-medium", STATUS_TONE[p.status])} aria-label={`Status de ${p.name}`}><SelectValue /></SelectTrigger>
      <SelectContent>{PROSPECT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
    </Select>
  );
}

const pill = (label: string, tone: string) => <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", tone)}>{label}</span>;
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

const CELLS: Record<ProspectColumn, (p: Prospect, campaigns: ProspectCampaign[]) => ReactNode> = {
  cidade: (p) => p.city ?? "—",
  estado: (p) => p.state ?? "—",
  nicho: (p) => p.niche ?? p.category ?? "—",
  telefone: (p) => p.phone ?? p.whatsapp ?? "—",
  site: (p) => (p.website ? "Sim" : <span className="font-medium text-success">Não</span>),
  contato: (p) => <ContactCell p={p} />,
  avaliacao: (p) => <Rating p={p} />,
  oportunidade: (p) => <>{pill(opportunity(p.score).label, opportunity(p.score).tone)} <span className="text-xs text-muted-foreground">{p.score ?? "—"}</span></>,
  intencao: (p) => <IntentCell p={p} />,
  status: (p) => <StatusCell p={p} />,
  temperatura: (p) => { const t = tempOf(p.temperature); return t ? pill(t.label, t.tone) : "—"; },
  prioridade: (p) => priorityLabel(p.priority),
  campanha: (p, cs) => cs.find((c) => c.id === p.campaign_id)?.name ?? "—",
  ultima: (p) => date(p.last_approach_at),
  obs: (p) => <span className="line-clamp-2 max-w-[220px] text-xs">{p.notes ?? "—"}</span>,
  criado: (p) => date(p.created_at),
};

export function ProspectRow({ p, campaigns, onConvert, onOpen, columns }: RowProps & { columns: ProspectColumn[] }) {
  const wa = waLink(p.whatsapp ?? p.phone, `Olá! Tudo bem? Falo com a ${p.name}?`);
  return (
    <tr className="border-b text-sm last:border-0 hover:bg-accent/30">
      <td className="max-w-[320px] px-3 py-2">
        <button type="button" onClick={onOpen} className="block max-w-full truncate text-left font-medium text-primary hover:underline">{p.name}</button>
        <p className="truncate text-xs text-muted-foreground">{p.category ?? "—"}</p>
      </td>
      {columns.map((c) => <td key={c} className="whitespace-nowrap px-3 py-2">{CELLS[c](p, campaigns)}</td>)}
      <td className="whitespace-nowrap px-3 py-2 text-right">
        {wa && <Button asChild size="icon" variant="ghost" className="size-8 text-success"><a href={wa} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${p.name}`}><MessageCircle className="size-4" /></a></Button>}
        <RowMenu p={p} campaigns={campaigns} onConvert={onConvert} onOpen={onOpen} />
      </td>
    </tr>
  );
}
