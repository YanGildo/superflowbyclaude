import { useEffect, useState } from "react";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { MoneyInput } from "@/components/finance/MoneyInput";
import { Input } from "@/components/ui/input";
import { useContacts, useCrmMutations } from "@/hooks/useCrm";
import type { Campaign } from "@/integrations/supabase/types";
import { CAMPAIGN_STATUS_OPTIONS, OBJECTIVES, PLATFORMS } from "@/lib/marketing";
import { campaignForm, campaignPayload, validateCampaign, type CampaignForm } from "@/lib/marketingForms";
import { AreaField, Field, FormShell, TextField } from "./FormShell";
import { opts } from "./options";

type SetField = <K extends keyof CampaignForm>(k: K, v: CampaignForm[K]) => void;
type NumKey = "daily_budget" | "total_budget" | "spend" | "revenue" | "impressions" | "clicks" | "leads" | "sales";

const MONEY: [NumKey, string][] = [["daily_budget", "Orçamento diário"], ["total_budget", "Orçamento total"], ["spend", "Investido"], ["revenue", "Receita"]];
const COUNTS: [NumKey, string][] = [["impressions", "Impressões"], ["clicks", "Cliques"], ["leads", "Leads"], ["sales", "Vendas"]];

function MetricFields({ f, set }: { f: CampaignForm; set: SetField }) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 sm:col-span-2 sm:grid-cols-4">
      {MONEY.map(([k, label]) => (
        <Field key={k} id={`cp-${k}`} label={label}>
          <MoneyInput id={`cp-${k}`} value={f[k]} onChange={(e) => set(k, e.target.value)} />
        </Field>
      ))}
      {COUNTS.map(([k, label]) => (
        <Field key={k} id={`cp-${k}`} label={label}>
          <Input id={`cp-${k}`} inputMode="numeric" value={f[k]} onChange={(e) => set(k, e.target.value.replace(/\D/g, ""))} placeholder="0" />
        </Field>
      ))}
    </div>
  );
}

function MainFields({ f, set }: { f: CampaignForm; set: SetField }) {
  const { data: contacts = [] } = useContacts();
  return (
    <>
      <TextField id="cp-name" label="Nome *" value={f.name} onChange={(v) => set("name", v)} wide autoFocus placeholder="Ex.: Leads — Ensaio com IA" />
      <Field id="cp-platform" label="Plataforma">
        <RefSelect id="cp-platform" value={f.platform} onChange={(v) => set("platform", v ?? "Meta Ads")} options={opts(PLATFORMS)} placeholder="Plataforma" />
      </Field>
      <Field id="cp-objective" label="Objetivo">
        <RefSelect id="cp-objective" value={f.objective} onChange={(v) => set("objective", v ?? "")} options={opts(OBJECTIVES)} placeholder="Objetivo" />
      </Field>
      <Field id="cp-status" label="Status">
        <SimpleSelect id="cp-status" value={f.status} onChange={(v) => set("status", v)} options={CAMPAIGN_STATUS_OPTIONS} />
      </Field>
      <Field id="cp-contact" label="Conta / cliente">
        <RefSelect id="cp-contact" value={f.contact_id} onChange={(v) => set("contact_id", v)} options={contacts} placeholder="Própria" />
      </Field>
      <TextField id="cp-start" label="Início" type="date" value={f.start_date} onChange={(v) => set("start_date", v)} />
      <TextField id="cp-end" label="Fim" type="date" value={f.end_date} onChange={(v) => set("end_date", v)} />
    </>
  );
}

export function CampaignDialog({ open, onOpenChange, campaign }: { open: boolean; onOpenChange: (o: boolean) => void; campaign?: Campaign | null }) {
  const { save } = useCrmMutations("campaigns");
  const [f, setF] = useState<CampaignForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(campaignForm(campaign));
  }, [open, campaign]);

  if (!f) return null;
  const set: SetField = (k, v) => setF((p) => (p ? { ...p, [k]: v } : p));
  const submit = async () => {
    const problem = validateCampaign(f);
    if (problem) return setError(problem);
    await save.mutateAsync(campaignPayload(f, campaign?.id));
    onOpenChange(false);
  };

  return (
    <FormShell open={open} onOpenChange={onOpenChange} onSubmit={submit} error={error} pending={save.isPending}
      title={campaign ? "Editar campanha" : "Nova campanha"} description="Até conectar Meta/Google, os números são preenchidos aqui.">
      <MainFields f={f} set={set} />
      <MetricFields f={f} set={set} />
      <TextField id="cp-lp" label="Página de destino" value={f.landing_page} onChange={(v) => set("landing_page", v)} placeholder="https://" />
      <TextField id="cp-region" label="Região" value={f.region} onChange={(v) => set("region", v)} placeholder="Ex.: São Paulo, Lisboa" />
      <AreaField id="cp-notes" label="Observações" value={f.notes} onChange={(v) => set("notes", v)} />
    </FormShell>
  );
}
