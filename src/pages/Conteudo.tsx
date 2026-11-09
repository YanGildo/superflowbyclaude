import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { AnalysisTab } from "@/components/content/AnalysisTab";
import { CalendarTab } from "@/components/content/CalendarTab";
import { CentralTab } from "@/components/content/CentralTab";
import { HooksTab } from "@/components/content/HooksTab";
import { ProductionTab } from "@/components/content/ProductionTab";
import { ReferencesTab } from "@/components/content/ReferencesTab";
import { StoriesTab } from "@/components/content/StoriesTab";
import { TrendsTab } from "@/components/content/TrendsTab";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "central", label: "Central" },
  { id: "calendario", label: "Calendário" },
  { id: "producao", label: "Produção" },
  { id: "ganchos", label: "Banco de ganchos" },
  { id: "pautas", label: "Pautas e histórias" },
  { id: "referencias", label: "Referências" },
  { id: "analise", label: "Análise" },
  { id: "emalta", label: "Em alta" },
];

/** Módulo Conteúdo (Social Media): o Superflow organiza e acompanha; o Claude escreve. */
export default function Conteudo() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get("aba"))?.id ?? "central";
  const go = (id: string) => { setParams((p) => { p.set("aba", id); return p; }, { replace: true }); window.scrollTo({ top: 0 }); };
  return (
    <div>
      <PageHeader eyebrow="Marketing" title="Conteúdo" description="Do áudio de 30 minutos ao mês de posts: pauta, peças, calendário, ganchos e resultados." />
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg border bg-card p-1" role="tablist" aria-label="Seções do conteúdo">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => go(t.id)}
            className={cn("shrink-0 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              tab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "central" && <CentralTab go={go} />}
      {tab === "calendario" && <CalendarTab />}
      {tab === "producao" && <ProductionTab />}
      {tab === "ganchos" && <HooksTab />}
      {tab === "pautas" && <StoriesTab />}
      {tab === "referencias" && <ReferencesTab />}
      {tab === "analise" && <AnalysisTab />}
      {tab === "emalta" && <TrendsTab />}
    </div>
  );
}
