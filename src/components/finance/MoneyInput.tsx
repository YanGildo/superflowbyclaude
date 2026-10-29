import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Campo de valor em reais. Aceita "1.234,56", "1234,56" ou "1234.56". */
export const MoneyInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(({ className, ...props }, ref) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
    <Input ref={ref} inputMode="decimal" autoComplete="off" placeholder="0,00" className={cn("pl-9 tabular-nums", className)} {...props} />
  </div>
));
MoneyInput.displayName = "MoneyInput";
