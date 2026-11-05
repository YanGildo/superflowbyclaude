import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace";

/** Tela de um módulo sem permissão neste espaço (o banco também bloqueia os dados). */
export function ModuleGuard({ path, children }: { path: string; children: ReactNode }) {
  const { canOpen, workspace } = useWorkspace();
  if (canOpen(path)) return <>{children}</>;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted"><Lock className="size-5 text-muted-foreground" /></span>
      <h1 className="font-heading text-lg font-semibold">Sem acesso a esta área</h1>
      <p className="text-sm text-muted-foreground">
        Na equipe <strong>{workspace?.name}</strong> você não tem permissão para este módulo. Peça ao dono ou a um admin da equipe para liberar.
      </p>
      <Button asChild variant="outline"><Link to="/">Voltar ao início</Link></Button>
    </div>
  );
}
