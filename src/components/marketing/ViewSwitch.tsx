import { CalendarDays, KanbanSquare, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type BoardView = "lista" | "kanban" | "calendario";
const VIEWS: { id: BoardView; label: string; icon: typeof List }[] = [
  { id: "lista", label: "Lista", icon: List },
  { id: "kanban", label: "Kanban", icon: KanbanSquare },
  { id: "calendario", label: "Calendário", icon: CalendarDays },
];

export function ViewSwitch({ value, onChange, calendarLabel = "Calendário" }: { value: BoardView; onChange: (v: BoardView) => void; calendarLabel?: string }) {
  return (
    <div className="inline-flex rounded-lg border bg-card p-0.5" role="radiogroup" aria-label="Visualização">
      {VIEWS.map((v) => (
        <button key={v.id} type="button" role="radio" aria-checked={value === v.id} onClick={() => onChange(v.id)}
          className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
            value === v.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
          <v.icon className="size-3.5" />{v.id === "calendario" ? calendarLabel : v.label}
        </button>
      ))}
    </div>
  );
}
