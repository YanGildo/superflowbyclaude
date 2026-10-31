import { useEffect, useState } from "react";
import { CheckCircle2, Cpu, Loader2, PlugZap, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/common/RefSelect";
import { useEngine } from "@/hooks/useEngine";
import type { ProspectProvider, ProspectSettings } from "@/lib/prospecting";

const PROVIDERS: { value: ProspectProvider; label: string }[] = [
  { value: "motor", label: "Motor próprio (Google Maps Scraper) — grátis" },
  { value: "apify", label: "Apify (pago por uso)" },
];

function TestResult({ engine }: { engine: ReturnType<typeof useEngine> }) {
  const t = engine.test;
  if (t.isSuccess) return <p className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-success"><CheckCircle2 className="size-4" />Motor conectado · {t.data.jobs} busca(s) guardada(s) nele.</p>;
  if (t.isError) return <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive"><XCircle className="mt-0.5 size-4 shrink-0" />{t.error.message}</p>;
  return null;
}

/** Onde as buscas rodam: motor próprio (endereço + senha) ou Apify. */
export function EngineCard({ s, set }: { s: ProspectSettings; set: (p: Partial<ProspectSettings>) => void }) {
  const engine = useEngine();
  const [show, setShow] = useState(false);
  useEffect(() => engine.test.reset(), [s.engineUrl, s.engineKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Cpu className="size-4" />Motor de busca</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="eg-prov" className="text-xs">Buscar com</Label>
            <SimpleSelect id="eg-prov" value={s.provider} onChange={(v) => set({ provider: v })} options={PROVIDERS} /></div>
          <div className="space-y-1.5"><Label htmlFor="eg-url" className="text-xs">Endereço do motor</Label>
            <Input id="eg-url" value={s.engineUrl} onChange={(e) => set({ engineUrl: e.target.value })} placeholder="http://localhost:8090" className="h-9" /></div>
          <div className="space-y-1.5"><Label htmlFor="eg-key" className="text-xs">Senha do motor (MOTOR_SENHA)</Label>
            <div className="flex gap-1.5"><Input id="eg-key" type={show ? "text" : "password"} value={s.engineKey} onChange={(e) => set({ engineKey: e.target.value })} className="h-9" />
              <Button type="button" variant="ghost" size="sm" onClick={() => setShow(!show)}>{show ? "Ocultar" : "Ver"}</Button></div></div>
        </div>
        <TestResult engine={engine} />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => engine.test.mutate({ url: s.engineUrl, key: s.engineKey })} disabled={engine.test.isPending}>
            {engine.test.isPending ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}Testar conexão
          </Button>
          <span className="text-xs text-muted-foreground">Salve as configurações depois de testar.</span>
        </div>
        <details className="rounded-lg border bg-muted/30 p-3 text-xs">
          <summary className="cursor-pointer font-medium">Como ligar o motor no seu PC (uma vez)</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>Instale e abra o <b>Docker Desktop</b>.</li>
            <li>No PowerShell, entre na pasta <code>motor-prospeccao</code> do projeto e rode <code>copy .env.example .env</code>.</li>
            <li>Abra o <code>.env</code>, troque a <code>MOTOR_SENHA</code> (só letras e números) e salve.</li>
            <li>Rode <code>docker compose up -d</code> (a 1ª vez baixa ~600 MB).</li>
            <li>Aqui: endereço <code>http://localhost:8090</code>, a mesma senha, <b>Testar conexão</b>. Se o Chrome perguntar sobre a rede local, clique em <b>Permitir</b>.</li>
          </ol>
          <p className="mt-2 text-muted-foreground">O motor só busca com o PC ligado e o Docker aberto. E-mails, redes e sinais de anúncio rodam no servidor (botão Enriquecer). Detalhes no <code>motor-prospeccao/LEIA-ME.md</code>.</p>
        </details>
      </CardContent>
    </Card>
  );
}
