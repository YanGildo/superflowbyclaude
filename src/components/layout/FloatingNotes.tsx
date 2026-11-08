import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useLocation } from "react-router-dom";
import { Copy, NotebookPen, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useUserNotes } from "@/hooks/useUserNotes";
import type { UserNote } from "@/integrations/supabase/types";
import { ALL_NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

const pageName = (path: string | null) => ALL_NAV_ITEMS.find((i) => i.path === path)?.label ?? path ?? "";

function NoteLine({ n }: { n: UserNote }) {
  const { update, remove } = useUserNotes();
  const [text, setText] = useState(n.body);
  const save = () => { const t = text.trim(); if (t && t !== n.body) update.mutate({ id: n.id, values: { body: t } }); else setText(n.body); };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setText(n.body); };
  return (
    <li className="group flex items-start gap-2 rounded-md px-1 py-1 hover:bg-muted/60">
      <Checkbox className="mt-1.5" checked={n.done} onCheckedChange={(c) => update.mutate({ id: n.id, values: { done: Boolean(c) } })} aria-label={`Feito: ${n.body}`} />
      <div className="min-w-0 flex-1">
        <input value={text} onChange={(e) => setText(e.target.value)} onBlur={save} onKeyDown={onKey} aria-label="Editar nota"
          className={cn("w-full bg-transparent text-sm outline-none", n.done && "text-muted-foreground line-through")} />
        {n.page && <p className="text-[10px] text-muted-foreground">{pageName(n.page)}</p>}
      </div>
      <button type="button" onClick={() => remove.mutate([n.id])} aria-label={`Apagar nota ${n.body}`}
        className="mt-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 focus:opacity-100"><Trash2 className="size-3.5" /></button>
    </li>
  );
}

function Panel({ onClose }: { onClose: () => void }) {
  const { pathname } = useLocation();
  const { list, add, remove } = useUserNotes();
  const [text, setText] = useState("");
  const notes = list.data ?? [];
  const open = notes.filter((n) => !n.done);
  const done = notes.filter((n) => n.done);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim(); if (!t) return;
    add.mutate({ body: t, page: pathname }); setText("");
  };
  const copyAll = async () => {
    const txt = open.map((n) => `- ${n.body}${n.page ? ` (${pageName(n.page)})` : ""}`).join("\n");
    await navigator.clipboard?.writeText(txt).catch(() => undefined); toast.success("Lista copiada.");
  };
  return (
    <div role="dialog" aria-label="Notas rápidas" className="flex max-h-[min(70vh,560px)] w-[min(92vw,360px)] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <NotebookPen className="size-4 text-primary" />
        <p className="flex-1 font-heading text-sm font-semibold">Notas rápidas <span className="font-normal text-muted-foreground">· {open.length}</span></p>
        {open.length > 0 && <Button size="icon" variant="ghost" className="size-7" onClick={copyAll} aria-label="Copiar lista"><Copy className="size-3.5" /></Button>}
        <Button size="icon" variant="ghost" className="size-7" onClick={onClose} aria-label="Fechar notas"><X className="size-4" /></Button>
      </div>
      <form onSubmit={submit} className="flex gap-2 border-b p-2">
        <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Anotar e apertar Enter…" aria-label="Nova nota" className="h-9" />
        <Button type="submit" size="icon" className="size-9 shrink-0" aria-label="Adicionar nota" disabled={!text.trim()}><Plus className="size-4" /></Button>
      </form>
      <div className="flex-1 overflow-y-auto p-2">
        {notes.length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">Anote aqui ideias de ajuste enquanto usa o Superflow. Fica salvo na sua conta e guarda em qual tela você estava.</p>}
        <ul className="space-y-0.5">{open.map((n) => <NoteLine key={n.id} n={n} />)}</ul>
        {done.length > 0 && (
          <div className="mt-2 border-t pt-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Feitas · {done.length}</p>
              <button type="button" className="text-[11px] text-muted-foreground hover:text-destructive" onClick={() => remove.mutate(done.map((n) => n.id))}>Limpar feitas</button>
            </div>
            <ul className="space-y-0.5">{done.map((n) => <NoteLine key={n.id} n={n} />)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}

/** Botão flutuante no canto inferior direito, em todas as telas: abre a lista de notas. */
export function FloatingNotes() {
  const [open, setOpen] = useState(false);
  const { list } = useUserNotes();
  const pending = (list.data ?? []).filter((n) => !n.done).length;
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 print:hidden">
      {open && <Panel onClose={() => setOpen(false)} />}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? "Fechar notas rápidas" : "Abrir notas rápidas"} aria-expanded={open}
        className="relative flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105">
        <NotebookPen className="size-5" />
        {pending > 0 && !open && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-brand-cyan px-1 text-center text-[11px] font-semibold leading-5 text-brand-navy">{pending}</span>}
      </button>
    </div>
  );
}
