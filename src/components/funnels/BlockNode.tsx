import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { blockDef, type BlockNode as BlockNodeType } from "./blocks";
import { cn } from "@/lib/utils";

/** % que avança, com uma casa decimal; null sem números. */
function conversionRate(visits?: number | null, conversions?: number | null): number | null {
  if (!visits || visits <= 0 || conversions == null) return null;
  return Math.round((conversions / visits) * 1000) / 10;
}

/** Números de visitas/conversões do bloco (some se nenhum foi preenchido). */
function BlockStats({ visits, conversions }: { visits?: number | null; conversions?: number | null }) {
  if (visits == null && conversions == null) return null;
  const rate = conversionRate(visits, conversions);
  return (
    <div className="mt-2 flex gap-3 border-t pt-1.5 text-[11px] text-muted-foreground">
      {visits != null && <span><b className="text-foreground">{visits}</b> entram</span>}
      {conversions != null && <span><b className="text-foreground">{conversions}</b> avançam</span>}
      {rate != null && <span className="ml-auto font-semibold text-primary">{rate}%</span>}
    </div>
  );
}

/** Bloco do funil: ícone colorido, nome e (se houver) números de visitas/conversões. */
function BlockNodeImpl({ data, selected }: NodeProps<BlockNodeType>) {
  const def = blockDef(data.kind);
  const Icon = def.icon;
  const isNote = data.kind === "nota";

  return (
    <div
      className={cn(
        "min-w-[170px] max-w-[220px] rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-shadow",
        selected && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        isNote && "border-dashed bg-amber-50 dark:bg-amber-950/30",
      )}
    >
      {!isNote && <Handle type="target" position={Position.Left} className="!size-2.5 !border-2 !border-card !bg-muted-foreground" />}
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: def.color }}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight">{data.label}</p>
          <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{def.label}</p>
        </div>
      </div>
      {isNote && data.note && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{data.note}</p>}
      {!isNote && <BlockStats visits={data.visits} conversions={data.conversions} />}
      {!isNote && <Handle type="source" position={Position.Right} className="!size-2.5 !border-2 !border-card !bg-primary" />}
    </div>
  );
}

export const BlockNode = memo(BlockNodeImpl);
