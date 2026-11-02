import type { MascotShape } from "@/lib/assistant";
import { cn } from "@/lib/utils";

/** Olhos: fechados (dormindo) ou abertos (acordado). */
function Eyes({ awake, y }: { awake: boolean; y: number }) {
  return awake ? (
    <g fill="#0A1A2F"><circle cx="40" cy={y} r="4.2" /><circle cx="60" cy={y} r="4.2" /><circle cx="41.5" cy={y - 1.5} r="1.3" fill="#fff" /><circle cx="61.5" cy={y - 1.5} r="1.3" fill="#fff" /></g>
  ) : (
    <g stroke="#0A1A2F" strokeWidth="2.6" strokeLinecap="round" fill="none"><path d={`M35 ${y} q5 4 10 0`} /><path d={`M55 ${y} q5 4 10 0`} /></g>
  );
}

function Body({ shape, awake }: { shape: MascotShape; awake: boolean }) {
  const fill = awake ? "url(#mascot-on)" : "url(#mascot-off)";
  if (shape === "robo") {
    return (
      <g>
        <line x1="50" y1="14" x2="50" y2="24" stroke="#0D47A1" strokeWidth="3" />
        <circle cx="50" cy="12" r="4" fill={awake ? "#26C6DA" : "#94A3B8"} />
        <rect x="22" y="24" width="56" height="50" rx="14" fill={fill} />
        <rect x="30" y="38" width="40" height="20" rx="8" fill="#E8F7FA" opacity="0.9" />
      </g>
    );
  }
  if (shape === "gato") {
    return (
      <g fill={fill}>
        <path d="M24 40 L28 16 L42 30 Z" /><path d="M76 40 L72 16 L58 30 Z" />
        <ellipse cx="50" cy="52" rx="30" ry="26" />
      </g>
    );
  }
  return <circle cx="50" cy="50" r="30" fill={fill} />;
}

/** Mascote do assistente: dorme quando está tudo em dia, acorda (com a contagem) quando tem coisa esperando. */
export function Mascot({ shape, count, size = 56, name }: { shape: MascotShape; count: number; size?: number; name: string }) {
  const awake = count > 0;
  const eyeY = shape === "robo" ? 48 : 50;
  return (
    <span className="relative inline-flex shrink-0" role="img" aria-label={awake ? `${name} acordado: ${count} item(ns) esperando` : `${name} dormindo: tudo em dia`}>
      <svg viewBox="0 0 100 100" width={size} height={size} className={cn(awake ? "motion-safe:animate-[mascot-bob_2.4s_ease-in-out_infinite]" : "opacity-90")}>
        <defs>
          <radialGradient id="mascot-on" cx="35%" cy="30%" r="75%"><stop offset="0%" stopColor="#7DE3EF" /><stop offset="60%" stopColor="#26C6DA" /><stop offset="100%" stopColor="#0D47A1" /></radialGradient>
          <radialGradient id="mascot-off" cx="35%" cy="30%" r="75%"><stop offset="0%" stopColor="#E2E8F0" /><stop offset="100%" stopColor="#94A3B8" /></radialGradient>
        </defs>
        {awake && <circle cx="50" cy="50" r="40" fill="#26C6DA" opacity="0.18" className="motion-safe:animate-pulse" />}
        <Body shape={shape} awake={awake} />
        <Eyes awake={awake} y={eyeY} />
        {!awake && <text x="74" y="26" fontSize="14" fontWeight="700" fill="#64748B" className="motion-safe:animate-pulse">z</text>}
      </svg>
      {awake && (
        <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-5 text-white shadow">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );
}
