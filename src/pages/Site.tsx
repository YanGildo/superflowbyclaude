import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink, Globe } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { useSiteForms } from "@/hooks/useSiteForms";
import { DOMAINS, KIND_LABEL, SITE_PAGES_URL, type SitePage } from "@/lib/siteMap";
import { SITE_URL } from "@/lib/siteForms";

const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => toast.success("Link copiado."), () => toast.error("Não consegui copiar."));

function LinkRow({ url, title, badges }: { url: string; title: string; badges?: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
      <div className="min-w-0"><p className="truncate text-sm font-medium">{title}</p><p className="truncate text-xs text-muted-foreground">{url.replace("https://", "")}</p></div>
      <div className="flex items-center gap-2">{badges}
        <button type="button" onClick={() => copy(url)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Copiar link de ${title}`}><Copy className="size-4" /></button>
        <a href={url} target="_blank" rel="noreferrer" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Abrir ${title}`}><ExternalLink className="size-4" /></a></div>
    </li>
  );
}

/** Tudo que está no ar: domínios e subdomínios, páginas do site da agência e formulários. */
export default function Site() {
  const { data: forms = [] } = useSiteForms();
  const pages = useQuery({
    queryKey: ["site-pages"],
    staleTime: 300_000,
    queryFn: async () => {
      const r = await fetch(SITE_PAGES_URL);
      if (!r.ok) throw new Error(String(r.status));
      return ((await r.json()) as { paginas: SitePage[] }).paginas;
    },
  });
  const list = pages.data ?? [];
  const formPaths = new Set(forms.map((f) => `/${f.slug}`));
  const groups: { title: string; items: SitePage[] }[] = [
    { title: "Páginas principais", items: list.filter((p) => p.tipo === "principal") },
    { title: "Demos de sites para clientes", items: list.filter((p) => p.tipo === "demo-cliente") },
    { title: "Portfólio (um projeto por página)", items: list.filter((p) => p.tipo === "portfolio") },
    { title: "Internas", items: list.filter((p) => p.tipo === "interna") },
  ].filter((g) => g.items.length);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Marketing" title="Site" description="Todos os domínios, subdomínios e páginas da RG Marketing num lugar só." />
      <section className="space-y-2" aria-label="Domínios e subdomínios">
        <h2 className="font-heading text-lg font-semibold">Domínios e subdomínios</h2>
        <Card><ul className="divide-y">
          {DOMAINS.map((d) => (
            <li key={d.host} className="space-y-1 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0"><p className="font-medium">{d.what}</p><p className="truncate text-xs text-muted-foreground">{d.host} · projeto {d.project}</p></div>
                <div className="flex items-center gap-2"><Badge variant="secondary">{KIND_LABEL[d.kind]}</Badge>{d.pending && <Badge variant="outline">Falta configurar</Badge>}
                  <button type="button" onClick={() => copy(`https://${d.host}`)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label={`Copiar ${d.host}`}><Copy className="size-4" /></button>
                  <a href={`https://${d.host}`} target="_blank" rel="noreferrer" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label={`Abrir ${d.host}`}><ExternalLink className="size-4" /></a></div>
              </div>
              {d.note && <p className="text-xs text-muted-foreground">{d.note}</p>}
            </li>
          ))}
        </ul></Card>
        <p className="text-xs text-muted-foreground">Lista conferida com a Vercel em 09/11/2026. Ao ligar um domínio novo, peça para atualizar aqui.</p>
      </section>
      <section className="space-y-2" aria-label="Formulários">
        <h2 className="font-heading text-lg font-semibold">Formulários (páginas de anúncio)</h2>
        {forms.length ? <Card><ul className="divide-y">{forms.map((f) => <LinkRow key={f.id} url={`${SITE_URL}/${f.slug}`} title={f.name} badges={<Badge variant={f.active ? "default" : "outline"}>{f.active ? "No ar" : "Desligado"}</Badge>} />)}</ul></Card>
          : <p className="text-sm text-muted-foreground">Nenhum formulário criado. Crie em CRM Agência → Formulários.</p>}
      </section>
      <section className="space-y-4" aria-label={`Páginas de ${SITE_URL}`}>
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold"><Globe className="size-5" />Páginas de rgmarketingbr.com</h2>
        {pages.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {pages.isError && <p className="text-sm text-muted-foreground">Não consegui ler a lista do site agora (ela só existe depois da próxima publicação do site). Os formulários acima continuam corretos.</p>}
        {groups.map((g) => {
          const items = g.items.filter((p) => !formPaths.has(p.path));
          const rows = <Card><ul className="divide-y">{items.map((p) => <LinkRow key={p.path} url={`${SITE_URL}${p.path}`} title={p.titulo} badges={p.indexavel ? <Badge variant="secondary">Aparece no Google</Badge> : undefined} />)}</ul></Card>;
          return g.items.length > 15 ? (
            <details key={g.title} className="space-y-1.5"><summary className="cursor-pointer text-sm font-semibold text-muted-foreground">{g.title} ({items.length}) · clique para ver</summary><div className="pt-1.5">{rows}</div></details>
          ) : (
            <div key={g.title} className="space-y-1.5"><h3 className="text-sm font-semibold text-muted-foreground">{g.title} ({items.length})</h3>{rows}</div>
          );
        })}
      </section>
    </div>
  );
}
