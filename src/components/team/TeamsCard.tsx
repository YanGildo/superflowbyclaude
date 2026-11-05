import { useState, type FormEvent } from "react";
import { ArrowRight, Loader2, Plus, User, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCreateTeam } from "@/hooks/useTeam";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";

/** Seus espaços: o privado e as equipes (criar e entrar). */
export function TeamsCard({ startOpen }: { startOpen?: boolean }) {
  const { workspaces, workspace, setWorkspaceId } = useWorkspace();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(Boolean(startOpen));
  const create = useCreateTeam((id) => { setName(""); setOpen(false); setWorkspaceId(id); });
  const submit = (e: FormEvent) => { e.preventDefault(); if (name.trim()) create.mutate(name.trim()); };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><UsersRound className="size-4 text-primary" />Seus espaços</CardTitle>
        <CardDescription>"Meu Superflow" é só seu. Cada equipe é um espaço à parte, onde você escolhe o que cada pessoa vê.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {workspaces.map((w) => {
          const team = w.kind === "equipe";
          const here = w.id === workspace?.id;
          return (
            <div key={w.id} className={cn("flex items-center gap-3 rounded-lg border p-3", here && "border-primary/50 bg-primary/5")}>
              {team ? <UsersRound className="size-4 text-primary" /> : <User className="size-4 text-muted-foreground" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{w.name}</p>
                <p className="text-xs text-muted-foreground">{team ? (w.owner_id === user?.id ? "Equipe · você é o dono" : "Equipe · você foi convidado") : "Privado · só você"}</p>
              </div>
              {here ? <span className="text-xs font-medium text-primary">Você está aqui</span>
                : <Button size="sm" variant="outline" onClick={() => setWorkspaceId(w.id)}>Entrar<ArrowRight className="size-4" /></Button>}
            </div>
          );
        })}
        {open ? (
          <form onSubmit={submit} className="flex flex-col gap-2 pt-1 sm:flex-row">
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da equipe (ex.: RG Marketing · Time)" aria-label="Nome da equipe" />
            <Button type="submit" disabled={!name.trim() || create.isPending}>{create.isPending && <Loader2 className="size-4 animate-spin" />}Criar equipe</Button>
          </form>
        ) : <Button variant="outline" onClick={() => setOpen(true)}><Plus className="size-4" />Nova equipe</Button>}
      </CardContent>
    </Card>
  );
}
