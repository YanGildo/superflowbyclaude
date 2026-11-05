import { UsersRound } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";

/** Aviso no menu quando você está dentro de uma equipe (a troca fica no seletor do topo). */
export function WorkspaceSwitcher() {
  const { workspace, isTeam } = useWorkspace();
  if (!isTeam) return null;
  return (
    <div className="mx-1 mb-1 flex items-center gap-2 rounded-md bg-brand-cyan/15 px-2 py-1.5 text-xs text-white group-data-[collapsible=icon]:hidden">
      <UsersRound className="size-3.5 shrink-0 text-brand-cyan" />
      <span className="truncate">Equipe · {workspace?.name}</span>
    </div>
  );
}
