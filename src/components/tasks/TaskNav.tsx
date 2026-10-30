import { useState, type FormEvent } from "react";
import { ListChecks, Plus, Workflow, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TaskView } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";
import { SMART, parseView, viewKey } from "./views";

type Named = { id: string; name: string };

function NavButton({
  active, icon: Icon, label, count, onClick,
}: { active: boolean; icon: LucideIcon; label: string; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
        active ? "bg-primary/10 font-medium text-primary" : "text-foreground/80 hover:bg-accent")}
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && <span className="text-xs text-muted-foreground">{count}</span>}
    </button>
  );
}

function NewListForm({ onCreate }: { onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreate(name);
    setName("");
  };
  return (
    <form onSubmit={submit} className="mt-1 flex items-center gap-1 px-1">
      <Plus className="size-4 shrink-0 text-primary" />
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova lista"
        aria-label="Nome da nova lista" className="h-8 border-0 bg-transparent px-1.5 shadow-none focus-visible:ring-0" />
    </form>
  );
}

/** Menu de visões no desktop: inteligentes, fluxos e listas (com campo de nova lista). */
export function TaskNavAside({ view, setView, flows, lists, count, onCreateList }: {
  view: TaskView; setView: (v: TaskView) => void; flows: Named[]; lists: Named[];
  count: (v: TaskView) => number; onCreateList: (name: string) => Promise<void>;
}) {
  const current = viewKey(view);
  return (
    <aside className="hidden w-60 shrink-0 space-y-5 lg:block">
      <div className="space-y-0.5">
        {SMART.map((s) => (
          <NavButton key={s.id} icon={s.icon} label={s.label} active={current === `smart:${s.id}`}
            count={s.id === "concluidas" ? undefined : count({ kind: "smart", id: s.id })}
            onClick={() => setView({ kind: "smart", id: s.id })} />
        ))}
      </div>

      <div>
        <p className="brand-eyebrow mb-1.5 px-2.5">Fluxos</p>
        <div className="space-y-0.5">
          {flows.map((f) => (
            <NavButton key={f.id} icon={Workflow} label={f.name} active={current === `flow:${f.id}`}
              count={count({ kind: "flow", id: f.id })} onClick={() => setView({ kind: "flow", id: f.id })} />
          ))}
        </div>
      </div>

      <div>
        <p className="brand-eyebrow mb-1.5 px-2.5">Listas</p>
        <div className="space-y-0.5">
          {lists.map((l) => (
            <NavButton key={l.id} icon={ListChecks} label={l.name} active={current === `list:${l.id}`}
              count={count({ kind: "list", id: l.id })} onClick={() => setView({ kind: "list", id: l.id })} />
          ))}
        </div>
        <NewListForm onCreate={onCreateList} />
      </div>
    </aside>
  );
}

/** Seletor de visão no celular. */
export function TaskViewSelect({ view, setView, flows, lists }: {
  view: TaskView; setView: (v: TaskView) => void; flows: Named[]; lists: Named[];
}) {
  return (
    <Select value={viewKey(view)} onValueChange={(v) => setView(parseView(v))}>
      <SelectTrigger className="h-9 w-44 lg:hidden" aria-label="Escolher lista"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectGroup>{SMART.map((s) => <SelectItem key={s.id} value={`smart:${s.id}`}>{s.label}</SelectItem>)}</SelectGroup>
        {flows.length > 0 && <SelectGroup><SelectLabel>Fluxos</SelectLabel>
          {flows.map((f) => <SelectItem key={f.id} value={`flow:${f.id}`}>{f.name}</SelectItem>)}</SelectGroup>}
        {lists.length > 0 && <SelectGroup><SelectLabel>Listas</SelectLabel>
          {lists.map((l) => <SelectItem key={l.id} value={`list:${l.id}`}>{l.name}</SelectItem>)}</SelectGroup>}
      </SelectContent>
    </Select>
  );
}
