import type { ReactNode } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { brl } from "@/lib/format";
import { shade, type Slice } from "@/lib/finPanel";

const TOOLTIP = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 };
/** Deslocamento da camada de baixo, em % da altura. */
const DEPTH = 4;

/**
 * Rosca com efeito 3D: uma camada mais escura deslocada para baixo faz a "lateral",
 * e um degradê em cada fatia dá o brilho de cima.
 */
export function Donut3D({ id, data, center, empty = "Sem dados" }: { id: string; data: Slice[]; center: ReactNode; empty?: string }) {
  const has = data.some((d) => d.value > 0);
  const slices = has ? data : [{ name: empty, value: 1, color: "#CBD5E1" }];
  return (
    <div className="relative h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            {slices.map((s, i) => (
              <linearGradient key={s.name} id={`${id}-g${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.85} />
                <stop offset="100%" stopColor={shade(s.color, 0.12)} />
              </linearGradient>
            ))}
          </defs>
          <Pie data={slices} dataKey="value" nameKey="name" cx="50%" cy={`${46 + DEPTH}%`} innerRadius="56%" outerRadius="80%"
            startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false} legendType="none" tooltipType="none">
            {slices.map((s) => <Cell key={s.name} fill={shade(s.color)} />)}
          </Pie>
          <Pie data={slices} dataKey="value" nameKey="name" cx="50%" cy="46%" innerRadius="56%" outerRadius="80%"
            startAngle={90} endAngle={-270} stroke="hsl(var(--card))" strokeWidth={2} paddingAngle={has && slices.length > 1 ? 1.5 : 0}>
            {slices.map((s, i) => <Cell key={s.name} fill={`url(#${id}-g${i})`} />)}
          </Pie>
          {has && <Tooltip formatter={(v: number) => brl(v)} contentStyle={TOOLTIP} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[46%] flex -translate-y-1/2 flex-col items-center text-center">{center}</div>
    </div>
  );
}

export function Legend({ items }: { items: { name: string; value: number; color: string }[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: s.color }} />{s.name} <b className="font-semibold text-foreground">{brl(s.value)}</b>
        </span>
      ))}
    </div>
  );
}
