import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionTabs({ tabs, tab, go, label }: { tabs: { id: string; label: string }[]; tab: string; go: (id: string) => void; label: string }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg border bg-card p-1" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => go(t.id)}
          className={cn("shrink-0 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
            tab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ icon: Icon, label, value, hint, tone, children }: {
  icon?: LucideIcon; label: string; value: ReactNode; hint?: ReactNode; tone?: "good" | "warn" | "bad"; children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{Icon && <Icon className="size-3.5" />}{label}</p>
      <p className={cn("mt-1 font-heading text-2xl font-semibold",
        tone === "good" && "text-success", tone === "warn" && "text-warning", tone === "bad" && "text-destructive")}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

export function Bar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full bg-primary transition-all", className)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}
