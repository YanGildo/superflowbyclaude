import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlarmClock, CalendarDays, CheckCircle2, ClipboardCheck, DollarSign, FileCheck2, FilePen, FileText, Image, KanbanSquare,
  Megaphone, Package, PackageCheck, Repeat, UserPlus, Users, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { FunnelCard, KpiSection, NextActionsCard, RankCard, type AgencyKpi } from "@/components/agency/AgencyWidgets";
import { ContactDialog } from "@/components/crm/ContactDialog";
import { ProposalDialog } from "@/components/crm/ProposalDialog";
import { useActivities, useContacts, useDeals, useProposals, useStages } from "@/hooks/useCrm";
import { useAgencyExtras } from "@/hooks/useAgency";
import { demandsByClient, opsKpis, salesKpis, topServices, type AgencyData } from "@/lib/agencyKpis";
import { brl, currentYM, localISODate, ymRange } from "@/lib/format";

function useAgencyData() {
  const ym = currentYM();
  const { data: contacts = [], isLoading } = useContacts();
  const { data: deals = [] } = useDeals();
  const { data: stages = [] } = useStages();
  const { data: proposals = [] } = useProposals();
  const { data: activities = [] } = useActivities("contato");
  const { data: extras } = useAgencyExtras(ymRange(ym).start);
  const data: AgencyData = { contacts, deals, stages, proposals, activities, extras };
  return { data, ym, loading: isLoading };
}

function buildSales(s: ReturnType<typeof salesKpis>): AgencyKpi[] {
  return [
    { label: "Clientes ativos", value: s.activeClients, icon: Users, to: "/comercial?aba=clientes" },
    { label: "Leads comerciais", value: s.openLeads, icon: UserPlus, to: "/comercial?aba=pipeline" },
    { label: "Propostas enviadas", value: s.sentProposals, icon: FileText, to: "/comercial?aba=propostas" },
    { label: "Propostas em aberto", value: s.openProposals, icon: FilePen, to: "/comercial?aba=propostas" },
    { label: "Aprovadas no mês", value: s.approvedMonth, icon: CheckCircle2, tone: "good" },
    { label: "Receita mensal prevista", value: brl(s.forecast), icon: DollarSign },
    { label: "Receita recorrente", value: brl(s.mrr), icon: Repeat, tone: "good" },
    { label: "Recebido no mês", value: brl(s.received), icon: Wallet, tone: "good", to: "/financeiro/contas?tipo=receber" },
  ];
}

function buildOps(o: ReturnType<typeof opsKpis>): AgencyKpi[] {
  return [
    { label: "Demandas em atraso", value: o.lateDeliveries, icon: AlarmClock, tone: o.lateDeliveries ? "bad" : "default" },
    { label: "Campanhas ativas", value: o.activeCampaigns, icon: Megaphone },
    { label: "Criativos pendentes", value: o.pendingCreatives, icon: Image },
    { label: "Conteúdos em aprovação", value: o.inApproval, icon: FileCheck2 },
    { label: "Reuniões da semana", value: o.meetingsWeek, icon: CalendarDays },
    { label: "Entregas do mês", value: o.deliveriesMonth, icon: Package },
  ];
}

export default function Agencia() {
  const { data, ym, loading } = useAgencyData();
  const [dlg, setDlg] = useState<"cliente" | "proposta" | null>(null);
  const byId = useMemo(() => new Map(data.contacts.map((c) => [c.id, c])), [data.contacts]);
  const today = localISODate();
  const pipelineId = data.stages[0]?.pipeline_id;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="CRM Agência" title="Dashboard da Agência" description="Visão geral comercial, operacional e financeira da agência." />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setDlg("cliente")}><UserPlus className="size-4" />Novo cliente</Button>
        <Button variant="outline" size="sm" onClick={() => setDlg("proposta")}><FileText className="size-4" />Nova proposta</Button>
        <Button asChild variant="outline" size="sm"><Link to="/comercial?aba=pipeline"><KanbanSquare className="size-4" />Pipeline</Link></Button>
        <Button asChild variant="outline" size="sm"><Link to="/comercial?aba=jornada"><ClipboardCheck className="size-4" />Checklist de onboarding</Link></Button>
        <Button asChild variant="outline" size="sm"><Link to="/marketing"><Megaphone className="size-4" />Campanhas e conteúdos</Link></Button>
        <Button asChild variant="outline" size="sm"><Link to="/marketing/entregas"><PackageCheck className="size-4" />Entregas</Link></Button>
      </div>
      <KpiSection title="Comercial e receita" kpis={buildSales(salesKpis(data, ym))} loading={loading} />
      <KpiSection title="Operação" kpis={buildOps(opsKpis(data, today, ym))} loading={loading} />
      <div className="grid gap-4 lg:grid-cols-2">
        <FunnelCard stages={data.stages.filter((s) => s.pipeline_id === pipelineId)} deals={data.deals} />
        <NextActionsCard contacts={data.contacts} />
        <RankCard title="Serviços mais vendidos" empty="Nenhum serviço cadastrado em clientes ativos ainda." rows={topServices(data.contacts).map(([label, n]) => ({ label, n }))} />
        <RankCard title="Demandas por cliente" empty="Nenhuma entrega vinculada a clientes ainda." rows={demandsByClient(data.extras, byId).map((r) => ({ label: r.name, n: r.n }))} />
      </div>
      <ContactDialog open={dlg === "cliente"} onOpenChange={(o) => !o && setDlg(null)} />
      <ProposalDialog open={dlg === "proposta"} onOpenChange={(o) => !o && setDlg(null)} />
    </div>
  );
}
