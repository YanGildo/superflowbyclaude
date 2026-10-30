import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, FileText, MoreHorizontal, Plus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/common/PageHeader";
import { Summary } from "@/components/finance/Summary";
import { fetchProposalItems, useContacts, useCrmMutations, useProposals } from "@/hooks/useCrm";
import { useProposalActions } from "@/hooks/useProposalActions";
import type { Contact, Proposal, ProposalStatus } from "@/integrations/supabase/types";
import { PROPOSAL_STATUS } from "@/lib/crm";
import { brl, currentYM } from "@/lib/format";
import { proposalText } from "@/lib/proposalForm";
import { cn } from "@/lib/utils";
import { ProposalDialog } from "./ProposalDialog";

const OPEN: ProposalStatus[] = ["rascunho", "enviada", "em_negociacao"];
const FILTERS = [
  { id: "abertas", label: "Em aberto", match: (p: Proposal) => OPEN.includes(p.status) },
  { id: "aprovadas", label: "Aprovadas", match: (p: Proposal) => p.status === "aprovada" },
  { id: "encerradas", label: "Recusadas / expiradas", match: (p: Proposal) => p.status === "recusada" || p.status === "expirada" },
  { id: "todas", label: "Todas", match: () => true },
];

function ProposalRow({ p, contact, onEdit }: { p: Proposal; contact?: Contact; onEdit: () => void }) {
  const act = useProposalActions();
  const { remove } = useCrmMutations("proposals");
  const st = PROPOSAL_STATUS[p.status];
  const copy = async () => {
    const items = await fetchProposalItems(p.id);
    await navigator.clipboard.writeText(proposalText(p, items, contact));
    toast.success("Texto da proposta copiado. É só colar no WhatsApp.");
  };
  const open = OPEN.includes(p.status);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold hover:underline">{p.title}</p>
        <p className="truncate text-xs text-muted-foreground">{contact?.name ?? "—"}{p.valid_until && ` · válida até ${new Date(p.valid_until + "T12:00:00").toLocaleDateString("pt-BR")}`}</p>
      </button>
      <div className="text-right text-sm">
        {Number(p.monthly_value) > 0 && <p className="font-heading font-semibold">{brl(Number(p.monthly_value))}<span className="text-xs font-normal text-muted-foreground">/mês</span></p>}
        {Number(p.setup_fee) > 0 && <p className="text-xs text-muted-foreground">+ {brl(Number(p.setup_fee))} único</p>}
      </div>
      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", st.tone)}>{st.label}</span>
      {p.status === "rascunho" && <Button size="sm" variant="outline" onClick={() => act.send(p)}><Send className="size-4" />Enviar</Button>}
      {open && p.status !== "rascunho" && <Button size="sm" onClick={() => act.approve(p)}><Check className="size-4" />Aprovar</Button>}
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-8" aria-label={`Mais ações para ${p.title}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={copy}><Copy className="mr-2 size-4" />Copiar texto para WhatsApp</DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
          {open && <DropdownMenuItem onClick={() => act.approve(p)}>Aprovar</DropdownMenuItem>}
          {open && <DropdownMenuItem onClick={() => act.refuse(p)}><X className="mr-2 size-4" />Recusada</DropdownMenuItem>}
          <DropdownMenuItem className="text-destructive" onClick={() => remove.mutate(p.id)}>Excluir</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ProposalsTab() {
  const { data: proposals = [], isLoading } = useProposals();
  const { data: contacts = [] } = useContacts();
  const [filter, setFilter] = useState("abertas");
  const [dialog, setDialog] = useState<{ open: boolean; p?: Proposal | null }>({ open: false });
  const byId = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const rule = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const list = proposals.filter(rule.match);
  const ym = currentYM();
  const openList = proposals.filter((p) => OPEN.includes(p.status));
  const approvedMonth = proposals.filter((p) => p.status === "aprovada" && p.approved_at?.slice(0, 7) === ym);
  const sumM = (l: Proposal[]) => l.reduce((a, p) => a + Number(p.monthly_value), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold">Propostas e Contratos</h2>
          <p className="text-sm text-muted-foreground">Cadastre, envie e converta propostas em clientes ativos.</p>
        </div>
        <Button onClick={() => setDialog({ open: true, p: null })}><Plus className="size-4" />Nova proposta</Button>
      </div>
      <Summary items={[
        { label: "Em aberto", value: sumM(openList), tone: "muted", hint: `${openList.length} proposta(s) · mensalidade` },
        { label: "Aprovadas no mês", value: sumM(approvedMonth), tone: "good", hint: `${approvedMonth.length} proposta(s)` },
        { label: "Setup a receber (abertas)", value: openList.reduce((a, p) => a + Number(p.setup_fee), 0), tone: "muted" },
        { label: "Ticket médio aprovado", value: approvedMonth.length ? sumM(approvedMonth) / approvedMonth.length : 0, tone: "good" },
      ]} />
      <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-0.5 sm:w-fit" role="tablist" aria-label="Filtrar propostas">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
            className={cn("rounded-md px-3 py-1.5 text-xs font-medium", filter === f.id ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
            {f.label} ({proposals.filter(f.match).length})
          </button>
        ))}
      </div>
      {isLoading ? <Skeleton className="h-40 rounded-xl" /> : list.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhuma proposta aqui" description="Monte a proposta com os serviços do catálogo. Aprovada, vira cliente e mensalidade automaticamente."
          action={<Button onClick={() => setDialog({ open: true, p: null })}><Plus className="size-4" />Nova proposta</Button>} />
      ) : (
        <div className="space-y-1.5">{list.map((p) => <ProposalRow key={p.id} p={p} contact={byId.get(p.contact_id)} onEdit={() => setDialog({ open: true, p })} />)}</div>
      )}
      <ProposalDialog open={dialog.open} proposal={dialog.p} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />
    </div>
  );
}
