import { PageHeader } from "@/components/common/PageHeader";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { PendingChecklist } from "@/components/integrations/PendingChecklist";
import { useIntegrations } from "@/hooks/useIntegrations";
import { PLANNED, type IntegrationStatus } from "@/lib/integrations";
import { Card } from "@/components/ui/card";

const GROUPS: { title: string; hint: string; statuses: IntegrationStatus[] }[] = [
  { title: "Funcionando", hint: "Já ligado e em uso.", statuses: ["ativo"] },
  { title: "Falta configurar / opcional", hint: "Depende de um passo seu.", statuses: ["configurar", "opcional"] },
  { title: "Próximas integrações", hint: "Entram na fase de Integrações. Até lá, o Superflow funciona sem elas.", statuses: ["em_breve"] },
  { title: "Pausado", hint: "Fica para a segunda etapa.", statuses: ["pausado"] },
];

/** Guia visual: o que está ligado, o que falta você fazer e o que vem depois. */
export default function Integracoes() {
  const { integrations } = useIntegrations();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Sistema" title="Integrações" description="O que está ligado, o que depende de você e o que vem nas próximas fases." />
      <PendingChecklist />
      {GROUPS.map((g) => {
        const list = integrations.filter((i) => g.statuses.includes(i.status));
        if (!list.length) return null;
        return (
          <section key={g.title} className="space-y-2" aria-label={g.title}>
            <div><h2 className="font-heading text-lg font-semibold">{g.title}</h2><p className="text-xs text-muted-foreground">{g.hint}</p></div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map((i) => <IntegrationCard key={i.id} i={i} />)}</div>
          </section>
        );
      })}
      <section className="space-y-2" aria-label="Planejado para depois">
        <div><h2 className="font-heading text-lg font-semibold">Planejado para depois</h2><p className="text-xs text-muted-foreground">Funções já desenhadas que ficaram pendentes por decisão sua.</p></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {PLANNED.map((p) => (
            <Card key={p.id} className="space-y-1 border-dashed p-4">
              <div className="flex items-start justify-between gap-2"><p className="font-heading font-semibold">{p.title}</p><span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">Pendente</span></div>
              <p className="text-sm text-muted-foreground">{p.what}</p>
              <p className="text-xs text-muted-foreground"><b>Onde:</b> {p.where}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
