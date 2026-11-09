import { useEffect, useState, type ReactNode } from "react";
import { ExternalLink, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useContentSettings, useMetrics, useQuestions, useRecordings, useStories } from "@/hooks/useContent";
import { useContentItems } from "@/hooks/useMarketing";
import type { RecordingStatus } from "@/integrations/supabase/types";
import { PENDENCIAS, WHISPER, personaText, promptCalendario, promptMapa, promptPacote, promptPauta } from "@/lib/content";
import { localISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CopyPrompt, Field } from "./ContentBits";

type Status = "feito" | "fazer" | "pendente";
const STATUS: Record<Status, { label: string; tone: string }> = {
  feito: { label: "Feito", tone: "bg-success/15 text-success" },
  fazer: { label: "A fazer", tone: "bg-warning/15 text-warning" },
  pendente: { label: "Pendente de integração", tone: "bg-muted text-muted-foreground" },
};
const ORDER: RecordingStatus[] = ["pauta", "gravado", "transcrito", "mapa", "pecas"];

function Step({ n, title, where, tool, status, children }: { n: number; title: string; where: string; tool: string; status: Status; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-semibold text-primary">{n}</span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">{title}<span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS[status].tone)}>{STATUS[status].label}</span></p>
        <p className="text-xs text-muted-foreground"><strong>Onde:</strong> {where} · <strong>Ferramenta:</strong> {tool}</p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Settings() {
  const { q, save } = useContentSettings();
  const [f, setF] = useState({ persona: "", frequency: "", platforms: "" });
  useEffect(() => { if (q.data) setF({ persona: q.data.persona ?? "", frequency: q.data.frequency ?? "", platforms: q.data.platforms ?? "" }); }, [q.data]);
  return (
    <details className="rounded-lg border bg-card p-3">
      <summary className="cursor-pointer text-sm font-medium">Quem sou eu nos pedidos (preenche os textos copiados)</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Field id="cs-persona" label="Quem sou e pra quem falo" className="sm:col-span-2"><Textarea id="cs-persona" rows={3} value={f.persona} onChange={(e) => setF({ ...f, persona: e.target.value })} /></Field>
        <Field id="cs-frequency" label="Frequência"><Input id="cs-frequency" value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })} placeholder="Ex.: 4 reels + 2 carrosséis por semana" /></Field>
        <Field id="cs-platforms" label="Plataformas"><Input id="cs-platforms" value={f.platforms} onChange={(e) => setF({ ...f, platforms: e.target.value })} placeholder="Instagram, TikTok" /></Field>
      </div>
      <Button size="sm" className="mt-3" onClick={() => save.mutate({ persona: f.persona || null, frequency: f.frequency || null, platforms: f.platforms || null })}>Salvar</Button>
    </details>
  );
}

/** Central: o fluxo inteiro, onde fazer cada etapa e o pedido pronto para o chat Social Media. */
export function CentralTab({ go }: { go: (tab: string) => void }) {
  const { data: recs = [] } = useRecordings();
  const { data: stories = [] } = useStories();
  const { data: questions = [] } = useQuestions();
  const { data: items = [] } = useContentItems();
  const { data: metrics = [] } = useMetrics();
  const { q: settings } = useContentSettings();
  const today = localISODate();
  const rec = recs.length ? recs[0] : null;
  const at = (s: RecordingStatus): Status => (rec && ORDER.indexOf(rec.status) >= ORDER.indexOf(s) ? "feito" : "fazer");
  const flags = {
    cal: items.some((c) => (c.publish_at ?? "") >= today) ? "feito" : "fazer",
    sched: items.some((c) => c.stage === "agendado") ? "feito" : "pendente",
    measured: metrics.some((m) => m.measured_on >= localISODate(new Date(Date.now() - 7 * 86400000))) ? "feito" : "fazer",
  } as Record<string, Status>;
  const pieceTitle = items.find((c) => ["ideia", "roteiro"].includes(c.stage))?.title || "[título]";
  const persona = personaText(settings.data);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
        <MessageSquareText className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>O que <strong>escreve</strong> (pauta, mapa de cortes, roteiro, legenda, calendário) roda no Claude, no chat <strong>Social Media</strong>, com as skills <code>minha-voz</code>, <code>producao-conteudo</code> e <code>kit-prompts-conteudo</code>. O Superflow organiza, guarda e acompanha. Nas etapas do Claude, clique em <strong>Copiar pedido</strong> e cole lá.</p>
      </div>
      <Settings />
      <div className="space-y-2" aria-label="Fluxo de produção">
        <Step n={1} title="Pauta da gravação" where="Claude, chat Social Media" tool="skill producao-conteudo" status={at("pauta")}>
          <CopyPrompt text={() => promptPauta(stories, questions, persona)} />
        </Step>
        <Step n={2} title="Gravar 30 min" where="Celular" tool="Gravador do iPhone ou qualquer app" status={at("gravado")}>
          <Button size="sm" variant="outline" onClick={() => go("pautas")}>Abrir pauta atual</Button>
        </Step>
        <Step n={3} title="Transcrever" where="iPhone (Copiar transcrição), Whisper no PC ou ElevenLabs Scribe" tool="Externa" status={at("transcrito")}>
          <CopyPrompt variant="outline" text={WHISPER} label="Copiar comando do Whisper" />
        </Step>
        <Step n={4} title="Mapa de cortes" where="Claude, chat Social Media" tool="skill producao-conteudo" status={at("mapa")}>
          <CopyPrompt text={() => promptMapa(rec)} />
        </Step>
        <Step n={5} title="Peças (carrossel, roteiro, legenda)" where="Claude, chat Social Media (+ Canva conectado)" tool="skills producao-conteudo e minha-voz" status={at("pecas")}>
          <CopyPrompt text={() => promptPacote(pieceTitle)} label={`Copiar pedido: ${pieceTitle.slice(0, 24)}`} />
          <Button size="sm" variant="outline" onClick={() => go("producao")}>Produção</Button>
        </Step>
        <Step n={6} title="Calendário" where="Claude gera o CSV, Superflow importa" tool="skill producao-conteudo" status={flags.cal}>
          <CopyPrompt text={promptCalendario()} />
          <Button size="sm" variant="outline" onClick={() => go("calendario")}>Importar CSV</Button>
        </Step>
        <Step n={7} title="Agendar" where="Meta Business Suite (grátis)" tool="Externa · Zernio = pendente" status={flags.sched}>
          <Button size="sm" variant="outline" asChild><a href="https://business.facebook.com/latest/content_calendar" target="_blank" rel="noreferrer"><ExternalLink className="size-4" />Meta Business Suite</a></Button>
        </Step>
        <Step n={8} title="Medir" where="Superflow, página Análise" tool="Interna" status={flags.measured}>
          <Button size="sm" variant="outline" onClick={() => go("analise")}>Abrir Análise</Button>
        </Step>
        <Step n={9} title="Relatório da semana" where="Claude, chat Social Media" tool="skill producao-conteudo" status="fazer">
          <Button size="sm" onClick={() => go("analise")}>Montar relatório</Button>
        </Step>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Pendências do módulo</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-1.5 pr-3">Pendência</th><th className="py-1.5 pr-3">O que é</th><th className="py-1.5">Onde vai rodar</th></tr></thead>
            <tbody>{PENDENCIAS.map((p) => <tr key={p.t} className="border-b last:border-0"><td className="py-1.5 pr-3 font-medium">{p.t}</td><td className="py-1.5 pr-3">{p.o}</td><td className="py-1.5 text-muted-foreground">{p.w}</td></tr>)}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
