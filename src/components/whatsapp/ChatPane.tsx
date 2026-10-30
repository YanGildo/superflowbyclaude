import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FAKE_REPLIES, useChat } from "@/hooks/useChat";
import { useChatMessages } from "@/hooks/useCrm";
import type { ChatThread, Contact, Script } from "@/integrations/supabase/types";
import { fillVars } from "@/lib/scripts";
import { cn } from "@/lib/utils";

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function Bubbles({ threadId }: { threadId: string }) {
  const { data: msgs = [] } = useChatMessages(threadId);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);
  return (
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-muted/30 p-4">
      {msgs.length === 0 && <p className="pt-10 text-center text-sm text-muted-foreground">Comece a conversa ou use um modelo rápido abaixo.</p>}
      {msgs.map((m) => (
        <div key={m.id} className={cn("max-w-[75%] rounded-xl px-3 py-2 text-sm shadow-sm", m.direction === "out" ? "ml-auto bg-primary text-primary-foreground" : "bg-card")}>
          <p className="whitespace-pre-wrap">{m.body}</p>
          <p className={cn("mt-1 text-right text-[10px]", m.direction === "out" ? "text-primary-foreground/70" : "text-muted-foreground")}>{when(m.at)} · simulado</p>
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}

function ChatHeader({ contact, onFake }: { contact?: Contact; onFake: () => void }) {
  const phone = contact?.whatsapp ?? contact?.phone ?? "sem telefone";
  const service = contact?.services[0];
  return (
    <header className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate font-heading font-semibold">{contact?.name}</p>
        <p className="truncate text-xs text-muted-foreground">{phone}{service ? ` · ${service}` : ""}</p>
      </div>
      <Button size="sm" variant="outline" onClick={onFake}><Bot className="size-4" />Resposta do cliente</Button>
    </header>
  );
}

const firstName = (c?: Contact) => (c?.contact_person || c?.name || "").split(" ")[0];

export function ChatPane({ thread, contact, templates, vars }: {
  thread: ChatThread; contact?: Contact; templates: Script[]; vars: Record<string, string>;
}) {
  const { send } = useChat();
  const [text, setText] = useState("");
  const first = firstName(contact);
  const submit = () => {
    if (!text.trim()) return;
    send.mutate({ threadId: thread.id, body: text.trim(), direction: "out" });
    setText("");
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } };
  const fake = () => send.mutate({ threadId: thread.id, body: FAKE_REPLIES[Math.floor(Math.random() * FAKE_REPLIES.length)], direction: "in" });

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
      <ChatHeader contact={contact} onFake={fake} />
      <Bubbles threadId={thread.id} />
      <div className="space-y-2 border-t p-3">
        {templates.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Modelos rápidos</span>
            {templates.slice(0, 8).map((s) => (
              <button key={s.id} type="button" onClick={() => setText(fillVars(s.body, { ...vars, nome: first }))}
                className="rounded-full border px-2 py-0.5 text-[11px] hover:bg-accent">{s.title}</button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} placeholder="Mensagem simulada… (Ctrl+Enter envia)" aria-label="Mensagem" />
          <Button onClick={submit} disabled={!text.trim() || send.isPending}><Send className="size-4" />Enviar</Button>
        </div>
      </div>
    </section>
  );
}
