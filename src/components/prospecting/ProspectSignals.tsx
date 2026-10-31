import { Facebook, Instagram, Linkedin, Mail, Youtube } from "lucide-react";
import type { Prospect } from "@/integrations/supabase/types";
import { intentLevel, techLabels } from "@/lib/prospecting";
import { cn } from "@/lib/utils";

const HOST: Record<string, string> = { google_workspace: "Google", microsoft_365: "Microsoft", other: "outro", none: "sem caixa" };

/** Nota de intenção (já investe em marketing) com os sinais encontrados no site. */
export function IntentCell({ p }: { p: Prospect }) {
  const lvl = intentLevel(p.intent_score);
  if (!lvl) return <span className="text-xs text-muted-foreground">{p.enrich_error === "sem site" ? "sem site" : "—"}</span>;
  const signals = p.tech ? techLabels(p.tech) : [];
  return (
    <div className="space-y-0.5">
      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", lvl.tone)}>{lvl.label}</span> <span className="text-xs text-muted-foreground">{p.intent_score}</span>
      {signals.length > 0 && <p className="max-w-[180px] truncate text-[11px] text-muted-foreground" title={signals.join(", ")}>{signals.join(" · ")}</p>}
      {p.tech?.cms && <p className="text-[11px] text-muted-foreground">Site em {p.tech.cms}{p.tech.mobile_friendly ? "" : " · não é mobile"}</p>}
    </div>
  );
}

const SOCIALS = [
  { k: "instagram", icon: Instagram, label: "Instagram" }, { k: "facebook", icon: Facebook, label: "Facebook" },
  { k: "linkedin", icon: Linkedin, label: "LinkedIn" }, { k: "youtube", icon: Youtube, label: "YouTube" },
] as const;

/** E-mail (com quem hospeda) e redes sociais encontradas. */
export function ContactCell({ p }: { p: Prospect }) {
  const email = p.emails?.[0] ?? p.email;
  const extra = [p.tiktok && "TikTok", p.x_profile && "X"].filter(Boolean);
  return (
    <div className="space-y-1">
      {email ? (
        <a href={`mailto:${email}`} className="flex max-w-[220px] items-center gap-1 truncate text-xs text-primary hover:underline" title={(p.emails ?? []).join(", ")}>
          <Mail className="size-3.5 shrink-0" />{email}{p.email_host && <span className="text-muted-foreground"> · {HOST[p.email_host] ?? p.email_host}</span>}
        </a>
      ) : <span className="text-xs text-muted-foreground">sem e-mail</span>}
      <div className="flex items-center gap-1.5">
        {SOCIALS.map((s) => p[s.k] && (
          <a key={s.k} href={p[s.k] as string} target="_blank" rel="noreferrer" aria-label={`${s.label} de ${p.name}`} className="text-muted-foreground hover:text-primary"><s.icon className="size-3.5" /></a>
        ))}
        {extra.length > 0 && <span className="text-[10px] text-muted-foreground">+{extra.join(", ")}</span>}
      </div>
    </div>
  );
}
