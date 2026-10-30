import { PageHeader } from "@/components/common/PageHeader";
import { InviteCard } from "@/components/team/InviteCard";
import { MembersCard } from "@/components/team/MembersCard";
import { WorkspaceNameCard } from "@/components/team/WorkspaceNameCard";
import { useTeam } from "@/hooks/useTeam";
import { useWorkspace } from "@/lib/workspace";
import { useAuth } from "@/lib/auth";

export default function Equipe() {
  const { workspace, isOwner, refresh } = useWorkspace();
  const { user } = useAuth();
  const ws = workspace?.id ?? "";
  const team = useTeam(ws);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader eyebrow="Sistema" title="Equipe" description="Quem tem acesso a este workspace." />
      {isOwner && <WorkspaceNameCard ws={ws} current={workspace?.name} onSaved={refresh} />}
      {isOwner && <InviteCard invite={team.invite} />}
      <MembersCard team={team} isOwner={isOwner} userId={user?.id} />
    </div>
  );
}
