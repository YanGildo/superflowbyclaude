import { useNavigate } from "react-router-dom";
import { Building2, Plus, User, UsersRound } from "lucide-react";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace";
import { useAuth } from "@/lib/auth";

const WS = "ws:";
const NEW_TEAM = "__nova_equipe";

/** Seletor do topo: negócios do espaço atual + troca entre "Meu Superflow" e as equipes. */
export function BusinessSwitcher() {
  const { businesses, businessFilter, setBusinessFilter, workspace, workspaces, setWorkspaceId } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTeam = workspace?.kind === "equipe";
  const others = workspaces.filter((w) => w.id !== workspace?.id);
  const mine = others.filter((w) => w.kind !== "equipe" && w.owner_id === user?.id);
  const teams = others.filter((w) => !mine.includes(w));

  const onChange = (v: string) => {
    if (v === NEW_TEAM) return navigate("/equipe?nova=1");
    if (v.startsWith(WS)) { setWorkspaceId(v.slice(WS.length)); return navigate("/"); }
    setBusinessFilter(v);
  };

  return (
    <Select value={businessFilter} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[170px] gap-2 bg-card sm:w-[250px]" aria-label="Espaço e negócio">
        {isTeam ? <UsersRound className="size-4 shrink-0 text-primary" /> : <Building2 className="size-4 shrink-0 text-muted-foreground" />}
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end" className="max-h-[70vh] w-[260px]">
        <SelectGroup>
          <SelectLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">{isTeam ? `Equipe · ${workspace?.name}` : "Meu Superflow"}</SelectLabel>
          <SelectItem value="all">{isTeam ? `${workspace?.name} · tudo` : "Todos os negócios"}</SelectItem>
          {businesses.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              <span className="inline-flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: b.color ?? "hsl(var(--muted-foreground))" }} />
                {b.name}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">Trocar de espaço</SelectLabel>
          {mine.map((w) => (
            <SelectItem key={w.id} value={WS + w.id}><span className="inline-flex items-center gap-2"><User className="size-3.5" />{w.name} (privado)</span></SelectItem>
          ))}
          {teams.map((w) => (
            <SelectItem key={w.id} value={WS + w.id}><span className="inline-flex items-center gap-2"><UsersRound className="size-3.5" />{w.name}</span></SelectItem>
          ))}
          <SelectItem value={NEW_TEAM}><span className="inline-flex items-center gap-2 text-primary"><Plus className="size-3.5" />Nova equipe</span></SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
