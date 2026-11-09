import { useSearchParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ActivityCard } from "@/components/team/ActivityCard";
import { InviteCard } from "@/components/team/InviteCard";
import { MembersCard } from "@/components/team/MembersCard";
import { TeamsCard } from "@/components/team/TeamsCard";
import { SignupsCard } from "@/components/team/SignupsCard";
import { WorkspaceNameCard } from "@/components/team/WorkspaceNameCard";
import { useTeam } from "@/hooks/useTeam";
import { useWorkspace } from "@/lib/workspace";
import { useAuth } from "@/lib/auth";

export default function Equipe() {
  const { workspace, isOwner, isManager, isTeam, refresh } = useWorkspace();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const ws = workspace?.id ?? "";
  const team = useTeam(ws, isTeam);
  const name = workspace?.name ?? "";

  if (!isTeam) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader eyebrow="Sistema" title="Equipe" description="Trabalhe junto sem abrir seus dados privados." />
        <div className="flex gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>Você está no <strong>{name}</strong>, seu espaço privado: ninguém mais vê nada daqui. Para colaborar, crie uma equipe, convide as pessoas e escolha módulo por módulo o que cada uma acessa. Projetos, planos, scripts e tarefas daqui podem ser levados para a equipe pelo botão <strong>Acesso</strong> de cada item.</p>
        </div>
        <TeamsCard startOpen={params.get("nova") === "1"} />
        <SignupsCard />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader eyebrow="Equipe" title={name} description="Quem participa, o que cada pessoa acessa e o que aconteceu." />
      {isOwner && <WorkspaceNameCard ws={ws} current={name} onSaved={refresh} />}
      {isManager && <InviteCard team={team} teamName={name} isOwner={isOwner} />}
      <MembersCard ws={ws} teamName={name} team={team} isManager={isManager} isOwner={isOwner} userId={user?.id} />
      <ActivityCard ws={ws} members={team.members.data ?? []} />
      <TeamsCard startOpen={params.get("nova") === "1"} />
      <SignupsCard />
    </div>
  );
}
