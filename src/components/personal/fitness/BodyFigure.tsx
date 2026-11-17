import type { BodyAssessment } from "@/integrations/supabase/types";
import { CIRCUMFERENCES, trend, type Trend } from "@/lib/fitness";

const TONE: Record<Trend, string> = { good: "#16a34a", bad: "#dc2626", same: "#64748b", none: "#64748b" };
const LABEL_X = { L: -66, R: 190, C: 190 } as const;

/** Boneco com as circunferências no lugar certo e a variação desde a avaliação anterior. */
export function BodyFigure({ now, before, color }: { now: BodyAssessment; before?: BodyAssessment | null; color: string }) {
  const points = CIRCUMFERENCES.filter((m) => m.x != null && now.circumferences[m.key]);
  const side = (k: string, s: "L" | "R" | "C") => (s !== "C" ? s : ["cintura", "quadril"].includes(k) ? "L" : "R");
  return (
    <svg viewBox="-70 0 330 420" className="mx-auto h-auto max-h-[460px] w-full max-w-md" role="img" aria-label="Boneco com as medidas do corpo">
      <defs>
        <linearGradient id="body-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <g fill="url(#body-fill)" stroke={color} strokeOpacity="0.55" strokeWidth="1.5" strokeLinejoin="round">
        <ellipse cx="100" cy="36" rx="19" ry="23" />
        <path d="M92 57 L108 57 L109 70 L91 70 Z" />
        <path d="M60 78 Q100 66 140 78 Q150 82 150 96 L146 128 Q140 150 134 166 Q131 186 138 212 L62 212 Q69 186 66 166 Q60 150 54 128 L50 96 Q50 82 60 78 Z" />
        <path d="M52 86 Q40 92 38 112 L32 170 Q30 196 28 226 Q27 236 34 238 Q40 238 41 228 L46 176 L58 118 Z" />
        <path d="M148 86 Q160 92 162 112 L168 170 Q170 196 172 226 Q173 236 166 238 Q160 238 159 228 L154 176 L142 118 Z" />
        <path d="M62 212 L99 212 L97 292 Q96 330 92 372 L90 400 Q90 410 80 410 L70 410 Q66 404 72 398 L74 372 Q70 330 70 292 Q64 250 62 212 Z" />
        <path d="M138 212 L101 212 L103 292 Q104 330 108 372 L110 400 Q110 410 120 410 L130 410 Q134 404 128 398 L126 372 Q130 330 130 292 Q136 250 138 212 Z" />
      </g>
      <g stroke={color} strokeOpacity="0.25" fill="none">
        <path d="M100 82 L100 205" /><path d="M76 100 Q100 112 124 100" />
      </g>
      {points.map((m) => {
        const s = side(m.key, m.side ?? "C");
        const v = now.circumferences[m.key];
        const prev = before?.circumferences[m.key];
        const t = trend(v, prev, m.better);
        const diff = prev ? v - prev : 0;
        const lx = LABEL_X[s];
        return (
          <g key={m.key}>
            <line x1={m.x} y1={m.y} x2={s === "L" ? lx + 54 : lx - 4} y2={m.y} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="2 2" />
            <circle cx={m.x} cy={m.y} r="3.6" fill="white" stroke={color} strokeWidth="2" />
            <text x={lx} y={(m.y ?? 0) - 2} fontSize="8.5" fill="currentColor" className="fill-muted-foreground" >{m.short ?? m.label}</text>
            <text x={lx} y={(m.y ?? 0) + 9} fontSize="10.5" fontWeight="600" fill="currentColor">
              {v.toLocaleString("pt-BR")} cm
              {prev ? <tspan fill={TONE[t]} fontSize="8.5"> {diff > 0 ? "▲" : diff < 0 ? "▼" : "="}{Math.abs(diff).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</tspan> : null}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
