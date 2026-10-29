import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleSelect } from "@/components/common/RefSelect";
import { useCategories, useFinMutations } from "@/hooks/useFinance";
import type { FinCategory } from "@/integrations/supabase/types";

const KIND_LABEL: Record<FinCategory["kind"], string> = { entrada: "Entrada", saida: "Saída", ambos: "Ambos" };

export function CategoriesManager() {
  const { data: cats = [] } = useCategories();
  const { save, patch, remove } = useFinMutations("fin_categories");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<FinCategory["kind"]>("saida");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    save.mutate({ name: name.trim(), kind }, { onSuccess: () => setName("") });
  };

  const groups: FinCategory["kind"][] = ["saida", "entrada", "ambos"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Categorias financeiras</CardTitle>
        <CardDescription>Usadas nos lançamentos e contas. Marque como essencial o que é gasto obrigatório (moradia, saúde...).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={submit} className="flex flex-wrap gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova categoria (ex.: Edição de vídeo)" aria-label="Nome da nova categoria" className="min-w-[200px] flex-1" />
          <div className="w-36"><SimpleSelect value={kind} onChange={setKind} options={groups.map((k) => ({ value: k, label: KIND_LABEL[k] }))} /></div>
          <Button type="submit" disabled={!name.trim() || save.isPending}><Plus className="size-4" />Adicionar</Button>
        </form>
        {groups.map((g) => {
          const list = cats.filter((c) => c.kind === g);
          if (!list.length) return null;
          return (
            <div key={g}>
              <p className="brand-eyebrow mb-2">{KIND_LABEL[g]}s</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {list.map((c) => (
                  <div key={c.id} className="group flex items-center gap-2 rounded-lg border px-3 py-2">
                    <span className="flex-1 truncate text-sm">{c.name}</span>
                    {g !== "entrada" && (
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Switch checked={c.essential} onCheckedChange={(v) => patch.mutate({ id: c.id, values: { essential: v } })} aria-label={`${c.name} é essencial`} />
                        essencial
                      </label>
                    )}
                    <Button size="icon" variant="ghost" className="size-7 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                      aria-label={`Excluir categoria ${c.name}`} onClick={() => remove.mutate(c.id)}><Trash2 className="size-3.5" /></Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground">Excluir uma categoria não apaga os lançamentos: eles ficam "sem categoria".</p>
      </CardContent>
    </Card>
  );
}
