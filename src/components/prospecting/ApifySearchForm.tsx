import { useState, type FormEvent } from "react";
import { Eraser, Loader2, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useProspectActions, useProspectSettings } from "@/hooks/useProspects";
import { cn } from "@/lib/utils";

const SAVED_KEY = "superflow:prospect-search";

type Form = { terms: string; city: string; state: string; neighborhood: string; country: string; limit: string; language: string };


function Field({ id, label, f, set, ph, k, wide }: { id: string; label: string; f: Form; set: (k: keyof Form, v: string) => void; ph?: string; k: keyof Form; wide?: boolean }) {
  return (
    <div className={cn("space-y-1.5", wide && "md:col-span-2")}>
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} className="h-9" />
    </div>
  );
}

/** Busca na Apify (opção alternativa ao motor próprio; o token fica no servidor). */
export function ApifySearchForm() {
  const { settings } = useProspectSettings();
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
  );
}
