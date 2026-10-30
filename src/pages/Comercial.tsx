import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { ActivityLogTab } from "@/components/crm/ActivityLogTab";
import { ClientsTab } from "@/components/crm/ClientsTab";
import { JourneyTab } from "@/components/crm/JourneyTab";
import { PipelineTab } from "@/components/crm/PipelineTab";
import { ProposalsTab } from "@/components/crm/ProposalsTab";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "pipeline", label: "Pipeline", el: <PipelineTab /> },
  { id: "clientes", label: "Clientes", el: <ClientsTab /> },
  { id: "propostas", label: "Propostas", el: <ProposalsTab /> },
  { id: "jornada", label: "Jornada do Cliente", el: <JourneyTab /> },
  { id: "conversoes", label: "Conversões", el: <ActivityLogTab category="conversao" /> },
  { id: "contatos", label: "Contatos", el: <ActivityLogTab category="contato" /> },
];

export default function Comercial() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get("aba")) ?? TABS[0];
  const go = (id: string) => setParams((p) => { p.set("aba", id); return p; }, { replace: true });

  return (
    <div>
      <PageHeader eyebrow="CRM Agência" title="Comercial" description="Pipeline, clientes, propostas, conversões e contatos em um só lugar." />
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg border bg-card p-1" role="tablist" aria-label="Seções do comercial">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab.id === t.id} onClick={() => go(t.id)}
            className={cn("shrink-0 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              tab.id === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>
      {tab.el}
    </div>
  );
}
