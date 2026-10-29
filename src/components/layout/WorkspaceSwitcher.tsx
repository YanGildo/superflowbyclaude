import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace";
import { useAuth } from "@/lib/auth";

/** Só aparece quando a pessoa participa de mais de um workspace (ex.: foi convidada). */
export function WorkspaceSwitcher() {
  const { workspaces, workspace, setWorkspaceId } = useWorkspace();
  const { user } = useAuth();
  if (workspaces.length < 2) return null;

  return (
    <div className="px-1 pb-1 group-data-[collapsible=icon]:hidden">
      <Select value={workspace?.id} onValueChange={setWorkspaceId}>
        <SelectTrigger aria-label="Trocar de workspace"
          className="h-8 border-sidebar-border bg-sidebar-accent text-xs text-white focus:ring-sidebar-ring">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {workspaces.map((w) => (
            <SelectItem key={w.id} value={w.id}>{w.name}{w.owner_id === user?.id ? " (seu)" : ""}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
