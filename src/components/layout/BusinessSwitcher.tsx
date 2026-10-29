import { Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace";

/** Filtro global: Todos / Pessoal / RG Marketing / ... (substitui os antigos "espaços"). */
export function BusinessSwitcher() {
  const { businesses, businessFilter, setBusinessFilter } = useWorkspace();

  return (
    <Select value={businessFilter} onValueChange={setBusinessFilter}>
      <SelectTrigger className="h-9 w-[200px] gap-2" aria-label="Filtrar por negócio">
        <Building2 className="size-4 shrink-0 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os negócios</SelectItem>
        {businesses.length > 0 && <SelectSeparator />}
        {businesses.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: b.color ?? "hsl(var(--muted-foreground))" }} />
              {b.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
