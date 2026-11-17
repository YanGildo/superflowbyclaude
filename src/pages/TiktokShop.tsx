import { PageHeader } from "@/components/common/PageHeader";
import { SectionTabs } from "@/components/personal/Bits";
import { TtsDiary, TtsGoals } from "@/components/personal/tiktok/TtsDiary";
import { TtsProducts, TtsVideos } from "@/components/personal/tiktok/TtsLists";
import { TtsPanel } from "@/components/personal/tiktok/TtsPanel";
import { useTab } from "@/hooks/useTab";

const TABS = [
  { id: "painel", label: "Painel" }, { id: "videos", label: "Vídeos" }, { id: "produtos", label: "Produtos" },
  { id: "diario", label: "Diário" }, { id: "metas", label: "Metas" },
];

/** TikTok Shop: organização do criador/afiliado (lançamento manual, sem API). */
export default function TiktokShop() {
  const [tab, go] = useTab(TABS.map((t) => t.id));
  return (
    <div>
      <PageHeader eyebrow="Pessoal" title="TikTok Shop" description="Meta do mês, quanto fazer por dia, fila de vídeos e produtos. Você lança os números; o painel faz a conta." />
      <SectionTabs tabs={TABS} tab={tab} go={go} label="Seções do TikTok Shop" />
      {tab === "painel" && <TtsPanel go={go} />}
      {tab === "videos" && <TtsVideos />}
      {tab === "produtos" && <TtsProducts />}
      {tab === "diario" && <TtsDiary />}
      {tab === "metas" && <TtsGoals />}
    </div>
  );
}
