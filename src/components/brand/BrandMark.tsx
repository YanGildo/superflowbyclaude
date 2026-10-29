import { cn } from "@/lib/utils";

/**
 * Marca do Superflow: um "S" geométrico em linhas, no estilo das linhas finas
 * da identidade RG (não usa o logo da RG).
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="8" fill="hsl(var(--brand-blue))" />
      <path
        d="M22 9.5H13a3.5 3.5 0 0 0 0 7h6a3.5 3.5 0 0 1 0 7h-9"
        fill="none"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M22 9.5 25 6.5" stroke="hsl(var(--brand-cyan))" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function BrandWordmark({ className, light }: { className?: string; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <div className="leading-tight">
        <p className={cn("font-heading text-[15px] font-semibold", light ? "text-white" : "text-foreground")}>Superflow</p>
        <p className={cn("text-[11px]", light ? "text-white/60" : "text-muted-foreground")}>Operação completa</p>
      </div>
    </div>
  );
}
