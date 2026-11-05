import { useState } from "react";
import { ArrowRightLeft, Lock, Share2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { SimpleSelect } from "@/components/common/RefSelect";
import { useMoveToWorkspace, useResourceAccess, type ResourceMember } from "@/hooks/useResourceAccess";
import { LEVELS, LEVEL_LABEL, RESOURCE_LABEL, rank, type Level, type ResourceType } from "@/lib/access";
import { useAuth } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/labels";
import { useWorkspace } from "@/lib/workspace";

const GRANT_OPTIONS = LEVELS.map((l) => ({ value: l.value, label: l.value === "none" ? "Padrão do módulo" : l.label }));

function MemberLine({ m, restricted, onSet, me }: { m: ResourceMember; restricted: boolean; onSet: (l: Level) => void; me: boolean }) {
  const full = m.role === "owner" || m.role === "admin" || m.module_level === "manage";
  const base: Level = restricted ? "none" : m.module_level;
  const eff: Level = full ? "manage" : (rank(m.grant_level) > rank(base) ? (m.grant_level as Level) : base);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{m.full_name || m.email}{me && " (você)"}</p>
        <p className="text-xs text-muted-foreground">{ROLE_LABEL[m.role]} · hoje: {LEVEL_LABEL[eff]}</p>
      </div>
      {full ? <span className="text-xs text-muted-foreground">Acesso total</span> : (
        <div className="w-44"><SimpleSelect value={(m.grant_level ?? "none") as Level} onChange={onSet} options={GRANT_OPTIONS} id={`grant-${m.user_id}`} /></div>
      )}
    </div>
  );
}

function MoveBox({ type, id, onDone }: { type: ResourceType; id: string; onDone: () => void }) {
  const { workspaces, workspace } = useWorkspace();
  const targets = workspaces.filter((w) => w.id !== workspace?.id);
  const [target, setTarget] = useState(targets.find((w) => w.kind === "equipe")?.id ?? targets[0]?.id ?? "");
  const move = useMoveToWorkspace(onDone);
  if (targets.length === 0) return <p className="text-sm text-muted-foreground">Crie uma equipe na tela Equipe para poder levar este item para lá.</p>;
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="flex-1"><SimpleSelect id="move-target" value={target} onChange={setTarget} options={targets.map((w) => ({ value: w.id, label: w.kind === "equipe" ? `Equipe · ${w.name}` : `${w.name} (privado)` }))} /></div>
      <Button variant="outline" disabled={!target || move.isPending} onClick={() => move.mutate({ type, id, target })}><ArrowRightLeft className="size-4" />Mover</Button>
    </div>
  );
}

function TeamAccess({ type, id }: { type: ResourceType; id: string }) {
  const { user } = useAuth();
  const { list, setGrant, setRestricted } = useResourceAccess(type, id, true);
  if (list.isLoading) return <Skeleton className="h-24" />;
  if (list.error) return <p className="text-sm text-muted-foreground">Só quem gerencia este item (ou o módulo) muda o acesso. Peça ao dono da equipe.</p>;
  const rows = list.data ?? [];
  const restricted = rows[0]?.restricted ?? false;
  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
        <Switch checked={restricted} onCheckedChange={(c) => setRestricted.mutate(c)} aria-label="Restringir este item" />
        <span><span className="flex items-center gap-1 font-medium"><Lock className="size-3.5" />Restringir</span>
          <span className="text-xs text-muted-foreground">{restricted ? "Só quem está liberado abaixo vê." : "Quem tem acesso ao módulo vê. Use abaixo para dar mais acesso a alguém só neste item."}</span></span>
      </label>
      <div className="space-y-1.5">{rows.map((m) => (
        <MemberLine key={m.user_id} m={m} restricted={restricted} me={m.user_id === user?.id} onSet={(l) => setGrant.mutate({ userId: m.user_id, level: l })} />
      ))}</div>
    </div>
  );
}

/** Janela de acesso de um item: quem vê / edita e mover entre o espaço privado e as equipes. */
export function AccessDialog({ type, id, title, open, onOpenChange }: { type: ResourceType; id: string; title: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { isTeam } = useWorkspace();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Acesso · {title}</DialogTitle>
          <DialogDescription>{isTeam ? `${RESOURCE_LABEL[type]} da equipe. Escolha quem vê e quem edita.` : `${RESOURCE_LABEL[type]} privado: só você vê. Para colaborar, mova para uma equipe (vai o próprio item, não uma cópia).`}</DialogDescription>
        </DialogHeader>
        {open && isTeam && <TeamAccess type={type} id={id} />}
        <div className="space-y-2 border-t pt-3">
          <p className="text-sm font-medium">{isTeam ? "Mover para outro espaço" : "Mover para uma equipe"}</p>
          <MoveBox type={type} id={id} onDone={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Botão "Acesso" de um item. */
export function AccessButton({ type, id, title, className }: { type: ResourceType; id: string; title: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const { isTeam } = useWorkspace();
  return (
    <>
      <Button size="sm" variant="outline" className={className} onClick={() => setOpen(true)} aria-label={`Acesso: ${title}`}>
        {isTeam ? <UsersRound className="size-4" /> : <Share2 className="size-4" />}Acesso
      </Button>
      <AccessDialog type={type} id={id} title={title} open={open} onOpenChange={setOpen} />
    </>
  );
}
