import { useMemo, useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/PageHeader";
import { useContacts, useStages } from "@/hooks/useCrm";
import type { Contact, ContactStatus } from "@/integrations/supabase/types";
import { CONTACT_STATUS, TEMPERATURE } from "@/lib/crm";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ContactDialog } from "./ContactDialog";
import { ContactSheet } from "./ContactSheet";

const FILTERS: { id: string; label: string; match: (c: Contact) => boolean }[] = [
  { id: "ativos", label: "Clientes ativos", match: (c) => c.status === "cliente_ativo" },
  { id: "leads", label: "Leads", match: (c) => c.status === "lead" || c.status === "em_negociacao" },
  { id: "pausados", label: "Pausados / cancelados", match: (c) => c.status === "pausado" || c.status === "cancelado" },
  { id: "perdidos", label: "Perdidos", match: (c) => c.status === "perdido" },
  { id: "todos", label: "Todos", match: () => true },
];

const search = (c: Contact, q: string) =>
  !q || [c.name, c.company, c.phone, c.email, c.segment, c.city].some((v) => v?.toLowerCase().includes(q.toLowerCase()));

function ClientRow({ c, onOpen }: { c: Contact; onOpen: () => void }) {
  const st = CONTACT_STATUS[c.status];
  return (
    <button type="button" onClick={onOpen}
      className="grid w-full grid-cols-1 items-center gap-2 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 md:grid-cols-[2fr_1fr_1.4fr_1.2fr_auto]">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{c.name}</p>
        <p className="truncate text-xs text-muted-foreground">{[c.company, c.segment, c.city].filter(Boolean).join(" · ") || "—"}</p>
      </div>
      <div className="text-sm">
        {c.monthly_value ? <span className="font-heading font-semibold">{brl(Number(c.monthly_value))}<span className="text-xs font-normal text-muted-foreground">/mês</span></span> : <span className="text-muted-foreground">—</span>}
        {c.plan_name && <p className="truncate text-xs text-muted-foreground">{c.plan_name}</p>}
      </div>
      <p className="truncate text-xs text-muted-foreground">{c.services.join(", ") || "Sem serviços"}</p>
      <p className="truncate text-xs">{c.next_action ?? <span className="text-muted-foreground">Sem próxima ação</span>}</p>
      <div className="flex items-center gap-1.5">
        {c.temperature && <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", TEMPERATURE[c.temperature].tone)}>{TEMPERATURE[c.temperature].label}</span>}
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", st.tone)}>{st.label}</span>
      </div>
    </button>
  );
}

export function ClientsTab() {
  const { data: contacts = [], isLoading } = useContacts();
  const { data: stages = [] } = useStages();
  const [filter, setFilter] = useState("ativos");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const rule = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const list = useMemo(() => contacts.filter((c) => rule.match(c) && search(c, q)), [contacts, rule, q]);
  const mrr = contacts.filter((c) => c.status === "cliente_ativo").reduce((a, c) => a + Number(c.monthly_value ?? 0), 0);
  const count = (id: string) => contacts.filter((c) => (FILTERS.find((f) => f.id === id) ?? FILTERS[4]).match(c)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold">Clientes da Agência</h2>
          <p className="text-sm text-muted-foreground">Contato, plano, serviços contratados e próxima ação. Receita recorrente: <b className="text-foreground">{brl(mrr)}/mês</b></p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="size-4" />Novo cliente</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-0.5" role="tablist" aria-label="Filtrar contatos">
          {FILTERS.map((f) => (
            <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium", filter === f.id ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
              {f.label} ({count(f.id)})
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, empresa, telefone…" aria-label="Buscar cliente" className="h-9 pl-9" />
        </div>
      </div>
      {isLoading ? <Skeleton className="h-40 rounded-xl" /> : list.length === 0 ? (
        <EmptyState icon={Users} title={contacts.length ? "Ninguém neste filtro" : "Nenhum cliente cadastrado ainda"}
          action={<Button onClick={() => setCreating(true)}><Plus className="size-4" />Cadastrar cliente</Button>} />
      ) : (
        <div className="space-y-1.5">{list.map((c) => <ClientRow key={c.id} c={c} onOpen={() => setOpenId(c.id)} />)}</div>
      )}
      <ContactDialog open={creating} onOpenChange={setCreating} defaultStatus={(filter === "leads" ? "lead" : "cliente_ativo") as ContactStatus} />
      <ContactSheet contact={contacts.find((c) => c.id === openId) ?? null} stages={stages} onClose={() => setOpenId(null)} />
    </div>
  );
}
