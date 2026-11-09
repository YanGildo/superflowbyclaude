import { useState, type ReactNode } from "react";
import { Check, ClipboardCopy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { scoreHook, VERDICT_TONE } from "@/lib/hookScore";
import { cn } from "@/lib/utils";

/** "Copiar pedido": texto pronto para colar no chat Social Media do Claude. */
export function CopyPrompt({ text, label = "Copiar pedido", size = "sm", variant = "default" }: { text: string | (() => string); label?: string; size?: "sm" | "default"; variant?: "default" | "outline" }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(typeof text === "function" ? text() : text).catch(() => undefined);
    setDone(true); toast.success("Copiado. Cole no chat Social Media do Claude."); setTimeout(() => setDone(false), 1500);
  };
  return <Button size={size} variant={variant} onClick={copy}>{done ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}{label}</Button>;
}

export function HookBadge({ text, showParts }: { text: string; showParts?: boolean }) {
  if (!text.trim()) return null;
  const r = scoreHook(text);
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={cn("rounded-full px-2 py-0.5 font-semibold", VERDICT_TONE[r.verdict])}>{r.verdict} · {r.score}</span>
        <span className="text-muted-foreground">mais fraco: {r.weakest}</span>
        {r.fatal.map((f) => <span key={f} className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">{f}</span>)}
      </div>
      {showParts && (
        <div className="grid grid-cols-5 gap-1" aria-label="Notas do gancho">
          {r.parts.map((p) => (
            <div key={p.key} className="rounded-md bg-muted/60 p-1.5 text-center">
              <p className="text-[10px] leading-tight text-muted-foreground">{p.label}</p>
              <p className={cn("text-sm font-semibold", p.value < 55 && "text-destructive")}>{p.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Field({ id, label, children, className }: { id: string; label: string; children: ReactNode; className?: string }) {
  return <div className={cn("space-y-1", className)}><Label htmlFor={id} className="text-xs">{label}</Label>{children}</div>;
}

export function Choice({ id, value, options, onChange, placeholder }: { id: string; value: string; options: string[] | { value: string; label: string }[]; onChange: (v: string) => void; placeholder?: string }) {
  const list = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} className="h-9"><SelectValue placeholder={placeholder ?? "Escolher"} /></SelectTrigger>
      <SelectContent>{list.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export function LinkOut({ href, children }: { href: string | null | undefined; children: ReactNode }) {
  if (!href) return null;
  return <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ExternalLink className="size-3.5" />{children}</a>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</p>;
}
