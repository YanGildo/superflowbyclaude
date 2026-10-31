import { useContentItems } from "@/hooks/useMarketing";
import type { ContentStage } from "@/integrations/supabase/types";
import { isVideo } from "@/lib/marketing";
import { ContentBoard } from "./ContentBoard";

const STAGES: ContentStage[] = ["ideia", "roteiro", "edicao", "revisao", "aprovado", "publicado"];

/** Posts, carrosséis, stories, criativos de anúncio e copies (vídeos ficam em Produção de Vídeos). */
export function ContentTab() {
  const { data = [] } = useContentItems();
  const items = data.filter((c) => !isVideo(c));
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-heading text-xl font-semibold">Conteúdo e criativos</h2>
        <p className="text-sm text-muted-foreground">Posts, carrosséis, stories, criativos de anúncio e copies — da ideia à publicação.</p>
      </div>
      <ContentBoard items={items} stages={STAGES} defaults={{ kind: "Post" }} emptyText="Nenhum conteúdo ainda." />
    </div>
  );
}
