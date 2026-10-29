import { useState, type FormEvent } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Task } from "@/integrations/supabase/types";
import { useTaskMutations } from "@/hooks/useTasks";

/**
 * Campo de adicionar tarefa. Enter cria.
 * Colar várias linhas cria uma tarefa por linha.
 * `defaults` define onde a tarefa nasce (lista, fluxo, meu dia...).
 */
export function QuickAddTask({ defaults, placeholder }: { defaults?: Partial<Task>; placeholder?: string }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const { create } = useTaskMutations();

  const addMany = async (titles: string[]) => {
    const clean = titles.map((t) => t.trim()).filter(Boolean);
    if (!clean.length) return;
    setBusy(true);
    try {
      for (const title of clean) await create.mutateAsync({ ...defaults, title });
      setValue("");
    } catch {
      /* o toast de erro já é mostrado pela mutation */
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void addMany([value]);
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <div className="relative flex-1">
        <Plus className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (text.includes("\n")) {
              e.preventDefault();
              void addMany(text.split(/\r?\n/));
            }
          }}
          placeholder={placeholder ?? "Adicionar tarefa (Enter). Cole várias linhas para criar várias."}
          aria-label="Adicionar tarefa"
          className="h-11 bg-card pl-9"
          disabled={busy}
        />
      </div>
      <Button type="submit" className="h-11" disabled={busy || !value.trim()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : "Adicionar"}
      </Button>
    </form>
  );
}
