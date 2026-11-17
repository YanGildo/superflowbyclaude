import { useState } from "react";
import { ExternalLink, Package, Plus, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/PageHeader";
import { FormDialog } from "@/components/personal/FormDialog";
import { useCrmMutations } from "@/hooks/useCrm";
import { useTtsProducts, useTtsVideos } from "@/hooks/usePersonal";
import type { TtsProduct, TtsVideo } from "@/integrations/supabase/types";
import { brl } from "@/lib/format";
import { dmy, type Field } from "@/lib/formFields";
import { commissionPerSale, PRODUCT_STATUS, productRanking, SAMPLE_LABEL, VIDEO_STATUS } from "@/lib/tiktokShop";
import { cn } from "@/lib/utils";

const PRODUCT_FIELDS: Field[] = [
  { key: "name", label: "Produto", required: true },
  { key: "link", label: "Link do produto", type: "url", placeholder: "https://…" },
  { key: "category", label: "Categoria", half: true, placeholder: "Casa, beleza, tech…" },
  { key: "status", label: "Situação", type: "select", half: true, options: PRODUCT_STATUS, initial: "testando" },
  { key: "price", label: "Preço (R$)", type: "number", half: true },
  { key: "commission_pct", label: "Comissão (%)", type: "number", half: true },
  { key: "sample_status", label: "Amostra", type: "select", half: true, initial: "sem_amostra",
    options: Object.entries(SAMPLE_LABEL).map(([value, label]) => ({ value, label })) },
  { key: "notes", label: "Notas", type: "textarea", rows: 2, placeholder: "Ângulo do vídeo, dor que resolve, concorrentes…" },
];

export function TtsProducts() {
  const products = useTtsProducts().data ?? [];
  const videos = useTtsVideos().data ?? [];
  const m = useCrmMutations("tts_products");
  const [edit, setEdit] = useState<TtsProduct | null | "new">(null);
  const ranking = productRanking(products, videos);
  const current = edit === "new" ? null : edit;
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={() => setEdit("new")}><Plus className="size-4" />Novo produto</Button></div>
      {ranking.length === 0 ? <EmptyState icon={Package} title="Nenhum produto ainda" description="Cadastre os produtos que você vai divulgar: preço, comissão e a situação da amostra." /> : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {ranking.map(({ product: p, posted, orders, commission }) => {
            const st = PRODUCT_STATUS.find((s) => s.value === p.status);
            const per = commissionPerSale(p);
            return (
              <button key={p.id} type="button" onClick={() => setEdit(p)} className="rounded-xl border bg-card p-3 text-left hover:border-primary/50">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{p.name}</p>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", st?.tone)}>{st?.label}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[p.category, p.price ? brl(Number(p.price)) : null, p.commission_pct ? `${p.commission_pct}%` : null, per ? `${brl(per)}/venda` : null].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <Badge variant="outline">{SAMPLE_LABEL[p.sample_status]}</Badge>
                  <span className="text-muted-foreground">{posted} vídeo(s) postado(s) · {orders} venda(s) · {brl(commission)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <FormDialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)} title={current ? "Editar produto" : "Novo produto"} fields={PRODUCT_FIELDS}
        initial={current} pending={m.save.isPending} onSubmit={(v) => m.save.mutateAsync(current ? { id: current.id, ...v } : v)}
        onDelete={current ? () => m.remove.mutate(current.id) : undefined} />
    </div>
  );
}

function videoFields(products: TtsProduct[]): Field[] {
  return [
    { key: "title", label: "Vídeo (gancho ou ideia)", required: true },
    { key: "product_id", label: "Produto", type: "ref", refs: products, placeholder: "Sem produto" },
    { key: "status", label: "Etapa", type: "select", half: true, options: VIDEO_STATUS, initial: "ideia" },
    { key: "planned_for", label: "Postar em", type: "date", half: true },
    { key: "posted_on", label: "Postado em", type: "date", half: true },
    { key: "link", label: "Link do vídeo", type: "url", half: true },
    { key: "views", label: "Visualizações", type: "number", half: true },
    { key: "clicks", label: "Cliques no produto", type: "number", half: true },
    { key: "orders", label: "Vendas", type: "number", half: true },
    { key: "commission", label: "Comissão (R$)", type: "number", half: true },
    { key: "gmv", label: "Vendido (GMV, R$)", type: "number", half: true },
    { key: "notes", label: "Notas / roteiro", type: "textarea", rows: 3 },
  ];
}

export function TtsVideos() {
  const videos = useTtsVideos().data ?? [];
  const products = useTtsProducts().data ?? [];
  const m = useCrmMutations("tts_videos");
  const [edit, setEdit] = useState<TtsVideo | null | "new">(null);
  const current = edit === "new" ? null : edit;
  const name = new Map(products.map((p) => [p.id, p.name]));
  const save = (v: Record<string, unknown>) => {
    const row: Record<string, unknown> = { ...v, views: v.views ?? 0, clicks: v.clicks ?? 0, orders: v.orders ?? 0, commission: v.commission ?? 0, gmv: v.gmv ?? 0 };
    if (row.status === "postado" && !row.posted_on) row.posted_on = new Date().toISOString().slice(0, 10);
    return m.save.mutateAsync(current ? { id: current.id, ...row } : row);
  };
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={() => setEdit("new")}><Plus className="size-4" />Novo vídeo</Button></div>
      {videos.length === 0 ? <EmptyState icon={Video} title="Nenhum vídeo ainda" description="Monte a fila: ideia › roteiro › gravado › editado › postado. Depois anote views e vendas." /> : (
        <div className="grid gap-3 lg:grid-cols-5">
          {VIDEO_STATUS.map((st) => {
            const list = videos.filter((v) => v.status === st.value);
            return (
              <section key={st.value} className="rounded-xl border bg-card/60 p-2" aria-label={`Vídeos: ${st.label}`}>
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{st.label} <span className="font-normal">({list.length})</span></p>
                <div className="space-y-1.5">
                  {list.map((v) => (
                    <button key={v.id} type="button" onClick={() => setEdit(v)} className="w-full rounded-lg border bg-card p-2 text-left text-sm hover:border-primary/50">
                      <p className="line-clamp-2 font-medium">{v.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{v.product_id ? name.get(v.product_id) : "Sem produto"}{v.planned_for && st.value !== "postado" ? ` · ${dmy(v.planned_for)}` : ""}</p>
                      {st.value === "postado" && <p className="text-[11px] text-muted-foreground">{v.views} views · {v.orders} venda(s) · {brl(Number(v.commission))}</p>}
                      {v.link && <a href={v.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary"><ExternalLink className="size-3" />abrir</a>}
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <FormDialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)} title={current ? "Editar vídeo" : "Novo vídeo"} fields={videoFields(products)}
        initial={current} pending={m.save.isPending} onSubmit={save} onDelete={current ? () => m.remove.mutate(current.id) : undefined} />
    </div>
  );
}
