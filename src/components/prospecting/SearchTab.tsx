import { useState, type FormEvent } from "react";
import { Eraser, History, Loader2, RefreshCw, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProspectActions, useProspectSearches, useProspectSettings } from "@/hooks/useProspects";
import type { ProspectSearch } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

const SAVED_KEY = "superflow:prospect-search";

type Form = { terms: string; city: string; state: string; neighborhood: string; country: string; limit: string; language: string };

const STATUS: Record<string, { label: string; tone: string }> = {
  running: { label: "Rodando", tone: "text-warning" }, done: { label: "Concluída", tone: "text-success" },
  failed: { label: "Falhou", tone: "text-destructive" }, pending: { label: "Aguardando", tone: "text-muted-foreground" },
  saved: { label: "Busca salva", tone: "text-primary" },
};

function Field({ id, label, f, set, ph, k, wide }: { id: string; label: string; f: Form; set: (k: keyof Form, v: string) => void; ph?: string; k: keyof Form; wide?: boolean }) {
  return (
    <div className={cn("space-y-1.5", wide && "md:col-span-2")}>
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} className="h-9" />
    </div>
  );
}

function SearchHistory({ list }: { list: ProspectSearch[] }) {
  const { sync } = useProspectActions();
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><History className="size-4" />Buscas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {list.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma busca ainda. Quando você buscar, ela aparece aqui.</p>}
        {list.map((s) => {
          const st = STATUS[s.is_saved ? "saved" : s.status] ?? STATUS.pending;
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.name ?? "Busca"}</p>
                <p className="truncate text-xs text-muted-foreground">{s.location ?? "—"} · {new Date(s.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              {s.status === "done" && <span className="text-xs text-muted-foreground">{s.result_count} encontrados · {s.new_count} novos</span>}
              <span className={cn("text-xs font-medium", st.tone)}>{st.label}</span>
              {s.status === "running" && (
                <Button size="sm" variant="outline" disabled={sync.isPending} onClick={() => sync.mutate(s.id)}>
                  {sync.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Atualizar
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function SearchTab() {
  const { settings } = useProspectSettings();
  const { data: searches = [] } = useProspectSearches();
  const { start } = useProspectActions();
  const empty: Form = { terms: "", city: "", state: "", neighborhood: "", country: settings.country, limit: String(settings.limit), language: settings.language };
  const [f, setF] = useState<Form>(() => {
    try { return { ...empty, ...JSON.parse(localStorage.getItem(SAVED_KEY) ?? "{}") }; } catch { return empty; }
  });
  const set = (k: keyof Form, v: string) => setF((p) => ({ ...p, [k]: v }));
  const filters = () => ({ ...f, terms: f.terms.split(",").map((t) => t.trim()).filter(Boolean), limit: Number(f.limit) || settings.limit });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!f.terms.trim()) return toast.error("Informe pelo menos um nicho ou termo (ex.: dentista, academia).");
    start.mutate(filters());
  };

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">Use os dados de prospecção com responsabilidade: evite spam, respeite pedidos de remoção e personalize a abordagem.</p>
      <Card>
        <CardContent className="p-5">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-3" noValidate>
            <Field id="ps-terms" label="Nichos / termos (separe por vírgula)" f={f} set={set} k="terms" ph="dentista, clínica de estética, academia" wide />
            <Field id="ps-limit" label="Quantidade máxima" f={f} set={set} k="limit" />
            <Field id="ps-city" label="Cidade" f={f} set={set} k="city" ph="Campinas, Orlando…" />
            <Field id="ps-state" label="Estado" f={f} set={set} k="state" ph="SP, FL…" />
            <Field id="ps-nb" label="Bairro / região" f={f} set={set} k="neighborhood" />
            <Field id="ps-country" label="País" f={f} set={set} k="country" />
            <Field id="ps-lang" label="Idioma" f={f} set={set} k="language" />
            <div className="flex flex-wrap items-end gap-2 md:col-span-3">
              <Button type="submit" disabled={start.isPending}>{start.isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}Buscar leads</Button>
              <Button type="button" variant="outline" onClick={() => { try { localStorage.setItem(SAVED_KEY, JSON.stringify(f)); } catch { /* sem storage */ } toast.success("Busca salva: ela abre preenchida da próxima vez."); }}>
                <Save className="size-4" />Salvar busca
              </Button>
              <Button type="button" variant="ghost" onClick={() => setF(empty)}><Eraser className="size-4" />Limpar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <SearchHistory list={searches} />
    </div>
  );
}
