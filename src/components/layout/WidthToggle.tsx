import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Alterna entre a largura padrão e a tela inteira (só no desktop). */
export function WidthToggle({ wide, onToggle }: { wide: boolean; onToggle: () => void }) {
  const label = wide ? "Voltar à largura padrão" : "Usar a largura toda da tela";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" size="icon" variant="ghost" className="hidden size-9 md:inline-flex" onClick={onToggle} aria-label={label} aria-pressed={wide}>
          {wide ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
