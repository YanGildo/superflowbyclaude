import { useState } from "react";
import { Eye, Link2, LogOut, ShieldCheck, SlidersHorizontal, Trash2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareLink } from "@/components/team/InviteCard";
import { MemberAccessDialog, PermissionsDialog } from "@/components/team/MemberDialogs";
import type { Invite, Member, useTeam } from "@/hooks/useTeam";
import { permissionSummary } from "@/lib/access";
import { ROLE_LABEL, shortDate } from "@/lib/labels";

type Team = ReturnType<typeof useTeam>;
interface Ctx { team: Team; isManager: boolean; isOwner: boolean; userId: string | undefined; onPerms: (m: Member) => void; onView: (m: Member) => void; onLeave: () => void }

function MemberActions({ m, c }: { m: Member; c: Ctx }) {
  const isMe = m.user_id === c.userId;
  const manageable = c.isManager && m.role !== "owner" && !isMe && (c.isOwner || m.role !== "admin");
  return (
    <div className="flex flex-wrap items-center gap-1">
      {c.isManager && <Button size="sm" variant="ghost" onClick={() => c.onView(m)} aria-label={`O que ${m.email} acessa`}><Eye className="size-4" />Acessos</Button>}
      {manageable && <Button size="sm" variant="outline" onClick={() => c.onPerms(m)} aria-label={`Permissões de ${m.email}`}><SlidersHorizontal className="size-4" />Permissões</Button>}
      {manageable && (
        <Button size="icon" variant="ghost" aria-label={`Remover ${m.email}`} className="text-muted-foreground hover:text-destructive"
          onClick={() => window.confirm(`Tirar ${m.full_name || m.email} da equipe? O acesso some na hora.`) && c.team.removeMember.mutate(m.user_id)}><Trash2 className="size-4" /></Button>
      )}
      {isMe && m.role !== "owner" && <Button size="sm" variant="ghost" onClick={c.onLeave}><LogOut className="size-4" />Sair da equipe</Button>}
    </div>
  );
}

function MemberRow({ m, c }: { m: Member; c: Ctx }) {
  const display = m.full_name || m.email;
  const full = m.role === "owner" || m.role === "admin";
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{display.slice(0, 1).toUpperCase()}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <span className="truncate">{display}{m.user_id === c.userId && " (você)"}</span>
          <Badge variant={m.role === "owner" ? "default" : "secondary"}>{m.role === "owner" && <ShieldCheck className="mr-1 size-3" />}{ROLE_LABEL[m.role]}</Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
        {m.permissions && <p className="mt-0.5 text-xs text-muted-foreground">{full ? "Acesso total à equipe" : permissionSummary(m.permissions)}</p>}
      </div>
      <MemberActions m={m} c={c} />
    </div>
  );
}

function PendingInvite({ i, team, teamName }: { i: Invite; team: Team; teamName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2 rounded-lg border border-dashed p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link2 className="size-4 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm">{i.email ?? "Link (qualquer pessoa)"}</span>
        <span className="text-xs text-muted-foreground">vale até {shortDate(i.expires_at.slice(0, 10))}</span>
        <Badge variant="outline">{ROLE_LABEL[i.role]}</Badge>
        <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>{open ? "Fechar" : "Ver link"}</Button>
        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => team.cancelInvite.mutate(i.id)}>Cancelar</Button>
      </div>
      <p className="text-xs text-muted-foreground">{i.role === "admin" ? "Acesso total" : permissionSummary(i.permissions)}</p>
      {open && <ShareLink token={i.token} team={teamName} email={i.email} />}
    </div>
  );
}

export function MembersCard({ ws, teamName, team, isManager, isOwner, userId }: {
  ws: string; teamName: string; team: Team; isManager: boolean; isOwner: boolean; userId: string | undefined;
}) {
  const [perms, setPerms] = useState<Member | null>(null);
  const [view, setView] = useState<Member | null>(null);
  const onLeave = () => { if (userId && window.confirm("Sair desta equipe? Você perde o acesso aos itens dela.")) team.removeMember.mutate(userId); };
  const c: Ctx = { team, isManager, isOwner, userId, onPerms: setPerms, onView: setView, onLeave };
  const invites = team.invites.data ?? [];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><UsersRound className="size-4 text-primary" />Membros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {team.members.isLoading ? <Skeleton className="h-14 rounded-lg" /> : (team.members.data ?? []).map((m) => <MemberRow key={m.user_id} m={m} c={c} />)}
        {isManager && invites.length > 0 && (
          <div className="space-y-2 pt-3" aria-label="Convites pendentes">
            <p className="brand-eyebrow">Convites aguardando</p>
            {invites.map((i) => <PendingInvite key={i.id} i={i} team={team} teamName={teamName} />)}
          </div>
        )}
      </CardContent>
      <PermissionsDialog m={perms} team={team} isOwner={isOwner} onClose={() => setPerms(null)} />
      <MemberAccessDialog ws={ws} m={view} onClose={() => setView(null)} />
    </Card>
  );
}
