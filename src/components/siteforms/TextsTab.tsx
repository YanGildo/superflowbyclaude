import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormContent } from "@/lib/siteForms";

type Section = "seo" | "intro" | "done";

function Field({ id, label, value, onChange, area, hint }: { id: string; label: string; value?: string; onChange: (v: string) => void; area?: boolean; hint?: string }) {
  return (
    <div className="space-y-1.5"><Label htmlFor={id}>{label}{hint && <span className="font-normal text-muted-foreground"> · {hint}</span>}</Label>
      {area ? <Textarea id={id} rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /> : <Input id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />}</div>
  );
}

/** Textos da página: capa, tela final (botão e WhatsApp) e título que aparece no Google/aba. */
export function TextsTab({ content, onChange }: { content: FormContent; onChange: (c: FormContent) => void }) {
  const set = (sec: Section, k: string, v: string) => onChange({ ...content, [sec]: { ...(content[sec] ?? {}), [k]: v } });
  const f = (sec: Section, k: string) => (content[sec] as Record<string, string | undefined> | undefined)?.[k];
  return (
    <div className="space-y-6">
      <section className="space-y-3"><h3 className="font-heading font-semibold">Capa (primeira tela)</h3>
        <Field id="i-eyebrow" label="Chamada pequena (acima do título)" value={f("intro", "eyebrow")} onChange={(v) => set("intro", "eyebrow", v)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="i-title" label="Título" value={f("intro", "title")} onChange={(v) => set("intro", "title", v)} />
          <Field id="i-hl" label="Final do título em destaque (ciano)" value={f("intro", "highlight")} onChange={(v) => set("intro", "highlight", v)} />
        </div>
        <Field id="i-sub" label="Texto de apoio" area value={f("intro", "subtitle")} onChange={(v) => set("intro", "subtitle", v)} />
        <Field id="i-btn" label="Texto do botão de começar" value={f("intro", "button")} onChange={(v) => set("intro", "button", v)} />
      </section>
      <section className="space-y-3"><h3 className="font-heading font-semibold">Tela final (botão do WhatsApp)</h3>
        <Field id="d-eyebrow" label="Chamada pequena" value={f("done", "eyebrow")} onChange={(v) => set("done", "eyebrow", v)} />
        <Field id="d-title" label="Título" hint="{nome} vira o primeiro nome" value={f("done", "title")} onChange={(v) => set("done", "title", v)} />
        <Field id="d-text" label="Texto" area value={f("done", "text")} onChange={(v) => set("done", "text", v)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="d-btn" label="Texto do botão final" value={f("done", "button")} onChange={(v) => set("done", "button", v)} />
          <Field id="d-wa" label="WhatsApp que recebe" hint="com código do país, só números" value={f("done", "whatsapp")} onChange={(v) => set("done", "whatsapp", v.replace(/\D/g, ""))} />
        </div>
        <Field id="d-msg" label="Primeira linha da mensagem pré-preenchida" hint="as respostas vêm logo abaixo" area value={f("done", "message")} onChange={(v) => set("done", "message", v)} />
      </section>
      <section className="space-y-3"><h3 className="font-heading font-semibold">Aba do navegador e privacidade</h3>
        <Field id="s-title" label="Título da aba" value={f("seo", "title")} onChange={(v) => set("seo", "title", v)} />
        <Field id="s-desc" label="Descrição curta" area value={f("seo", "description")} onChange={(v) => set("seo", "description", v)} />
        <Field id="pv" label="Aviso de privacidade (embaixo da pergunta do WhatsApp)" value={content.privacy} onChange={(v) => onChange({ ...content, privacy: v })} />
      </section>
    </div>
  );
}
