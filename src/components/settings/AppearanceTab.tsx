import { useState } from "react";
import { Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { THEMES, readTheme, saveTheme, type ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Miniatura de cada tema: fundo, menu e um card. */
const PREVIEW: Record<ThemeId, { page: string; side: string; card: string; line: string }> = {
  claro: { page: "#F2F5F9", side: "#0A1A2F", card: "#FFFFFF", line: "#D5DEE9" },
  escuro: { page: "#05101E", side: "#030B16", card: "#0B1A2D", line: "#1C2E45" },
  black: { page: "#000000", side: "#050505", card: "#0D0D0D", line: "#262626" },
  hibrido: { page: "#05101E", side: "#030B16", card: "#FFFFFF", line: "#D5DEE9" },
};

function ThemePreview({ id }: { id: ThemeId }) {
  const c = PREVIEW[id];
  return (
    <div className="flex h-20 overflow-hidden rounded-md border" style={{ background: c.page }}>
      <div className="w-1/5" style={{ background: c.side }}>
        <div className="mx-1.5 mt-2 h-1.5 rounded-full bg-[#26C6DA]" />
      </div>
      <div className="flex-1 space-y-1.5 p-2">
        <div className="h-2 w-1/3 rounded-full" style={{ background: c.line }} />
        <div className="h-9 rounded" style={{ background: c.card, border: `1px solid ${c.line}` }}>
          <div className="m-1.5 h-1.5 w-1/2 rounded-full bg-[#0D47A1]" />
        </div>
      </div>
    </div>
  );
}

export function AppearanceTab() {
  const [current, setCurrent] = useState<ThemeId>(readTheme);
  const choose = (id: ThemeId) => { saveTheme(id); setCurrent(id); };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aparência</CardTitle>
        <CardDescription>O tema muda na hora e fica lembrado neste navegador. As cores seguem a identidade da RG.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Tema">
        {THEMES.map((t) => (
          <button key={t.id} type="button" role="radio" aria-label={t.label} aria-checked={current === t.id} onClick={() => choose(t.id)}
            className={cn("space-y-2 rounded-lg border p-2.5 text-left transition-colors hover:border-primary/50",
              current === t.id && "border-primary ring-2 ring-primary/30")}>
            <ThemePreview id={t.id} />
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.hint}</p>
              </div>
              {current === t.id && <Check className="size-4 shrink-0 text-primary" />}
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
