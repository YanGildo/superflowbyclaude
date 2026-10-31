import { Switch } from "@/components/ui/switch";
import type { EnrichChoice } from "@/lib/mapsEngine";

const ITEMS: { k: keyof EnrichChoice; label: string; hint: string }[] = [
  { k: "emails", label: "E-mails", hint: "Lê o site de cada empresa" },
  { k: "deep", label: "Páginas de contato", hint: "Se a home não tem e-mail, abre Contato/Sobre" },
  { k: "socials", label: "Redes sociais", hint: "Instagram, Facebook, LinkedIn, TikTok, YouTube, X" },
  { k: "tech", label: "Sinais de anúncio", hint: "Pixel Meta, Google Ads, Analytics… e nota de intenção" },
  { k: "verify", label: "Verificar e-mails", hint: "Tira domínios que não existem e mostra Google/Microsoft" },
];

/** Escolha do que buscar nos sites (roda no servidor, sem IA). */
export function EnrichSwitches({ value, onChange }: { value: EnrichChoice; onChange: (v: EnrichChoice) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {ITEMS.map((i) => (
        <label key={i.k} className="flex items-start gap-2 rounded-lg border bg-card p-2.5 text-sm">
          <Switch checked={value[i.k]} disabled={i.k === "deep" && !value.emails} onCheckedChange={(c) => onChange({ ...value, [i.k]: c })} aria-label={i.label} />
          <span><span className="font-medium">{i.label}</span><span className="block text-[11px] text-muted-foreground">{i.hint}</span></span>
        </label>
      ))}
    </div>
  );
}
