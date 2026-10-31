import { CheckCircle2, Clapperboard, Lightbulb, Video } from "lucide-react";
import { useContentItems } from "@/hooks/useMarketing";
import type { ContentStage } from "@/integrations/supabase/types";
import { VIDEO_GROUPS, isVideo } from "@/lib/marketing";
import { ContentBoard } from "./ContentBoard";
import { KpiGrid } from "./Kpis";

const STAGES: ContentStage[] = ["ideia", "roteiro", "gravacao", "edicao", "revisao", "aprovado", "publicado"];
const ICONS = [Lightbulb, Video, Clapperboard, CheckCircle2];
const TONES = [undefined, "bg-warning/15 text-warning", "bg-info/10 text-info", "bg-success/10 text-success"];

export function VideosTab() {
  const { data = [] } = useContentItems();
  const videos = data.filter(isVideo);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-semibold">Produção de vídeos</h2>
        <p className="text-sm text-muted-foreground">Reels e vídeos: roteiro, gravação, edição e publicação.</p>
      </div>
      <KpiGrid items={VIDEO_GROUPS.map((g, i) => ({
        label: g.label, value: videos.filter((v) => g.stages.includes(v.stage)).length, icon: ICONS[i], tone: TONES[i],
      }))} />
      <ContentBoard items={videos} stages={STAGES} defaults={{ kind: "Reels" }} calendarLabel="Gravações"
        dateOf={(c) => c.recording_at ?? c.publish_at?.slice(0, 10) ?? null} emptyText="Nenhum vídeo ainda." />
    </div>
  );
}
