import { Mail, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SimpleSelect } from "@/components/common/RefSelect";
import type { Member, useTeam } from "@/hooks/useTeam";
import { INVITE_ROLE_OPTIONS, ROLE_LABEL } from "@/lib/labels";

type Team = ReturnType<typeof useTeam>;

function MemberRow({ m, isMe, isOwner, team }: { m: Member; isMe: boolean; isOwner: boolean; team: Team }) {
  const display = m.full_name || m.email;
  const editable = m.role !== "owner" && isOwner;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {display.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{display}{isMe && " (você)"}</p>
        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
      </div>
      {!editable ? (
        <Badge variant={m.role === "owner" ? "default" : "secondary"}>
          {m.role === "owner" && <ShieldCheck className="mr-1 size-3" />}{ROLE_LABEL[m.role]}
        </Badge>
      ) : (
        <>
          <div className="w-40">
            <SimpleSelect value={m.role} onChange={(r) => team.changeRole.mutate({ userId: m.user_id, r })} options={INVITE_ROLE_OPTIONS} />
          </div>
          <Button size="icon" variant="ghost" aria-label={`Remover ${m.email}`} className="text-muted-foreground hover:text-destructive"
            onClick={() => team.removeMember.mutate(m.user_id)}><Trash2 className="size-4" /></Button>
        </>
      )}
    </div>
  );
}

function PendingInvites({ team, isOwner }: { team: Team; isOwner: boolean }) {
  const list = team.invites.data ?? [];
  if (list.length === 0) return null;
  return (
    <div className="pt-3">
      <p className="brand-eyebrow mb-2">Convites aguardando cadastro</p>
      {list.map((i) => (
        <div key={i.id} className="flex items-center gap-3 rounded-lg border border-dashed p-3">
          <Mail className="size-4 text-muted-foreground" />
          <span className="flex-1 truncate text-sm">{i.email}</span>
          <Badge variant="outline">{ROLE_LABEL[i.role]}</Badge>
          {isOwner && <Button size="sm" variant="ghost" onClick={() => team.cancelInvite.mutate(i.id)}>Cancelar</Button>}
        </div>
      ))}
    </div>
  );
}

export function MembersCard({ team, isOwner, userId }: { team: Team; isOwner: boolean; userId: string | undefined }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><UsersRound className="size-4 text-primary" />Membros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {team.members.isLoading ? <Skeleton className="h-14 rounded-lg" /> : (team.members.data ?? []).map((m) => (
          <MemberRow key={m.user_id} m={m} isMe={m.user_id === userId} isOwner={isOwner} team={team} />
        ))}
        <PendingInvites team={team} isOwner={isOwner} />
      </CardContent>
    </Card>
  );
}
