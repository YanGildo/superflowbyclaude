import { ExternalLink, MapPin, MessageCircle, MoreHorizontal, Star, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProspectActions } from "@/hooks/useProspects";
import type { Prospect, ProspectCampaign } from "@/integrations/supabase/types";
import { waLink } from "@/lib/crm";
import { PROSPECT_STATUS, STATUS_TONE, opportunity } from "@/lib/prospecting";
import { cn } from "@/lib/utils";

const siteUrl = (s: string) => (s.startsWith("http") ? s : `https://${s}`);

function RowMenu({ p, campaigns, onConvert }: { p: Prospect; campaigns: ProspectCampaign[]; onConvert: () => void }) {
  const { patch, remove } = useProspectActions();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-8" aria-label={`Mais ações para ${p.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!p.converted_contact_id && <DropdownMenuItem onClick={onConvert}><UserPlus className="mr-2 size-4" />Converter em lead</DropdownMenuItem>}
        {p.maps_url && <DropdownMenuItem asChild><a href={p.maps_url} target="_blank" rel="noreferrer"><MapPin className="mr-2 size-4" />Abrir no Google Maps</a></DropdownMenuItem>}
        {p.website && <DropdownMenuItem asChild><a href={siteUrl(p.website)} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 size-4" />Abrir site</a></DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Campanha</DropdownMenuLabel>
        {campaigns.map((c) => <DropdownMenuItem key={c.id} onClick={() => patch.mutate({ id: p.id, values: { campaign_id: c.id } })}>{c.name}</DropdownMenuItem>)}
        {campaigns.length === 0 && <DropdownMenuItem disabled>Nenhuma campanha</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={() => remove.mutate(p.id)}>Excluir</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Rating({ p }: { p: Prospect }) {
  if (!p.rating) return <>—</>;
  return <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-warning text-warning" />{Number(p.rating).toFixed(1)} <span className="text-xs text-muted-foreground">({p.reviews_count ?? 0})</span></span>;
}

function NameCell({ p }: { p: Prospect }) {
  const href = p.maps_url ?? (p.website ? siteUrl(p.website) : null);
  return (
    <>
      {href ? <a href={href} target="_blank" rel="noreferrer" className="block truncate font-medium text-primary hover:underline">{p.name}</a>
        : <p className="truncate font-medium">{p.name}</p>}
      <p className="truncate text-xs text-muted-foreground">{p.category ?? "—"}</p>
    </>
  );
}

export function ProspectRow({ p, campaigns, onConvert }: { p: Prospect; campaigns: ProspectCampaign[]; onConvert: () => void }) {
  const { patch } = useProspectActions();
  const opp = opportunity(p.score);
  const wa = waLink(p.whatsapp ?? p.phone, `Olá! Tudo bem? Falo com a ${p.name}?`);
  return (
    <tr className="border-b text-sm last:border-0 hover:bg-accent/30">
      <td className="max-w-[320px] px-3 py-2"><NameCell p={p} /></td>
      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{[p.city, p.state].filter(Boolean).join("/") || "—"}</td>
      <td className="whitespace-nowrap px-3 py-2">{p.phone ?? "—"}</td>
      <td className="px-3 py-2">{p.website ? "Sim" : <span className="font-medium text-success">Não</span>}</td>
      <td className="whitespace-nowrap px-3 py-2"><Rating p={p} /></td>
      <td className="px-3 py-2"><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", opp.tone)}>{opp.label}</span> <span className="text-xs text-muted-foreground">{p.score ?? "—"}</span></td>
      <td className="px-3 py-2">
        <Select value={p.status} onValueChange={(v) => patch.mutate({ id: p.id, values: { status: v, ...(v === "Abordado" ? { last_approach_at: new Date().toISOString() } : {}) } })}>
          <SelectTrigger className={cn("h-7 w-[130px] border-0 text-xs font-medium", STATUS_TONE[p.status])} aria-label={`Status de ${p.name}`}><SelectValue /></SelectTrigger>
          <SelectContent>{PROSPECT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right">
        {wa && <Button asChild size="icon" variant="ghost" className="size-8 text-success"><a href={wa} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${p.name}`}><MessageCircle className="size-4" /></a></Button>}
        <RowMenu p={p} campaigns={campaigns} onConvert={onConvert} />
      </td>
    </tr>
  );
}
