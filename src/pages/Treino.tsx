import { PageHeader } from "@/components/common/PageHeader";
import { SectionTabs } from "@/components/personal/Bits";
import { AssessmentsTab } from "@/components/personal/fitness/AssessmentsTab";
import { DietTab } from "@/components/personal/fitness/DietTab";
import { EvolutionTab } from "@/components/personal/fitness/EvolutionTab";
import { TrainingTab } from "@/components/personal/fitness/TrainingTab";
import { useTab } from "@/hooks/useTab";

const TABS = [
  { id: "evolucao", label: "Evolução" }, { id: "avaliacoes", label: "Avaliações" },
  { id: "treinos", label: "Treinos" }, { id: "dieta", label: "Dieta" },
];

/** Treino e dieta: nível de evolução, avaliações físicas, fichas e plano alimentar. */
export default function Treino() {
  const [tab, go] = useTab(TABS.map((t) => t.id));
  return (
    <div>
      <PageHeader eyebrow="Pessoal" title="Treino e dieta" description="Seu nível de evolução pela avaliação física, o boneco com as medidas, treinos feitos e a dieta do dia." />
      <SectionTabs tabs={TABS} tab={tab} go={go} label="Seções do treino" />
      {tab === "evolucao" && <EvolutionTab go={go} />}
      {tab === "avaliacoes" && <AssessmentsTab />}
      {tab === "treinos" && <TrainingTab />}
      {tab === "dieta" && <DietTab />}
    </div>
  );
}
