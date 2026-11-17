import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, FileUp, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common/PageHeader";
import { RefSelect } from "@/components/common/RefSelect";
import { useAdMetrics } from "@/hooks/useAdMetrics";
import { useContacts } from "@/hooks/useCrm";
import { AD_PLATFORMS, buildTree, div, type Node } from "@/lib/adReports";
import { brl, localISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdImportDialog } from "./AdImportDialog";

const n = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const money = (v: number | null) => (v == null ? "—" : brl(v));
const pct = (v: number | null) => (v == null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`);
const INDENT = { campanha: "pl-2", conjunto: "pl-7", anuncio: "pl-12" } as const;
const daysAgo = (d: number) => { const x = new Date(); x.setDate(x.getDate() - d); return localISODate(x); };

function Row({ node, open, toggle }: { node: Node; open: Set<string>; toggle: (k: string) => void }) {
  const t = node.totals;
  const id = `${node.level}:${node.key}`;
  const has = node.children.length > 0;
  const cells = [money(t.spend), n(t.impressions), n(t.clicks), pct(div(t.clicks * 100, t.impressions)), n(t.leads), money(div(t.spend, t.leads)),
    n(t.crm), money(div(t.spend, t.crm)), n(t.hot)];
  return (
    <>
      <tr className={cn("border-t", node.level === "campanha" && "bg-muted/30 font-medium")}>
        <td className={cn("py-1.5 pr-2", INDENT[node.level])}>
          <button type="button" className="flex items-center gap-1 text-left disabled:cursor-default" disabled={!has} onClick={() => toggle(id)} aria-expanded={has ? open.has(id) : undefined}>
            {has ? (open.has(id) ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />) : <span className="w-3.5" />}
            <span className="line-clamp-2">{node.name}</span>
          </button>
        </td>
        {cells.map((c, i) => <td key={i} className={cn("whitespace-nowrap px-2 py-1.5 text-right tabular-nums", i >= 6 && "bg-primary/5")}>{c}</td>)}
      </tr>
      {open.has(id) && node.children.map((c) => <Row key={`${id}/${c.key}`} node={c} open={open} toggle={toggle} />)}
    </>
  );
}

const HEAD = ["Investido", "Impressões", "Cliques", "CTR", "Leads (plataforma)", "CPL (plataforma)", "Leads no CRM", "CPL real", "Quentes"];

/** Relatórios importados em árvore: Campanha › Conjunto (público) › Anúncio, com os leads que chegaram no CRM. */
export function AdsTab() {
  const metrics = useAdMetrics().data ?? [];
  const contacts = useContacts().data ?? [];
  const [importing, setImporting] = useState(false);
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(localISODate());
  const [platform, setPlatform] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const tree = buildTree(metrics.filter((m) => !platform || m.platform === platform), contacts, from, to);
  const toggle = (k: string) => setOpen((s) => { const x = new Set(s); if (x.has(k)) x.delete(k); else x.add(k); return x; });
  const expandAll = () => setOpen(new Set(tree.flatMap((c) => [`campanha:${c.key}`, ...c.children.map((s) => `conjunto:${s.key}`)])));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-xs text-muted-foreground">De<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" aria-label="Data inicial" /></label>
        <label className="space-y-1 text-xs text-muted-foreground">Até<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" aria-label="Data final" /></label>
        <div className="w-48"><RefSelect value={platform} onChange={setPlatform} options={AD_PLATFORMS.map((p) => ({ id: p, name: p }))} placeholder="Todas as plataformas" /></div>
        {tree.length > 0 && <Button variant="ghost" size="sm" onClick={expandAll}>Abrir conjuntos</Button>}
        <Button className="ml-auto" onClick={() => setImporting(true)}><FileUp className="size-4" />Importar relatório (CSV)</Button>
      </div>
      {tree.length === 0 ? (
        <EmptyState icon={Layers} title={metrics.length ? "Nada neste período" : "Nenhum relatório importado"}
          description="Exporte do Gerenciador de Anúncios no nível de campanha, conjunto ou anúncio (com a quebra por Dia, se quiser) e importe aqui. Os leads do CRM são ligados pelo nome da campanha, do conjunto e do anúncio." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm" aria-label="Campanhas, conjuntos e anúncios">
            <thead className="text-xs text-muted-foreground">
              <tr><th className="px-2 py-2 text-left">Campanha › Conjunto › Anúncio</th>{HEAD.map((h, i) => <th key={h} className={cn("px-2 py-2 text-right font-medium", i >= 6 && "bg-primary/5 text-primary")}>{h}</th>)}</tr>
            </thead>
            <tbody>{tree.map((c) => <Fragment key={c.key}><Row node={c} open={open} toggle={toggle} /></Fragment>)}</tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Colunas em destaque vêm do CRM: leads que entraram no Superflow vindos daquela campanha/conjunto/anúncio (CSV ou formulário do Meta, ou UTM do site). CPL real = investido ÷ leads no CRM.</p>
      <AdImportDialog open={importing} onOpenChange={setImporting} />
    </div>
  );
}
