import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ALL_NAV_ITEMS, PHASE_LABEL } from "@/lib/nav";

/** Tela temporária dos módulos que entram nas próximas fases. */
export default function EmBreve() {
  const { pathname } = useLocation();
  const item = ALL_NAV_ITEMS.find((i) => i.path === pathname);
  const Icon = item?.icon ?? Construction;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{item?.label ?? "Página"}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{item?.description}</p>
      </div>
      {item && <Badge variant="secondary">{PHASE_LABEL[item.phase]}</Badge>}
      <p className="max-w-sm text-xs text-muted-foreground">
        O banco de dados deste módulo já está pronto. A tela entra na fase indicada.
      </p>
    </div>
  );
}
