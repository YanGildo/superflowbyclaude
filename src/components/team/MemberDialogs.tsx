import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SimpleSelect } from "@/components/common/RefSelect";
import { PermissionMatrix } from "@/components/team/PermissionMatrix";
import { useMemberAccess, type AccessEntry, type InviteRole, type Member, type useTeam } from "@/hooks/useTeam";
import { LEVEL_LABEL, MODULE_LABEL, RESOURCE_LABEL, type ModuleKey, type Permissions, type ResourceType } from "@/lib/access";
import { INVITE_ROLE_OPTIONS, ROLE_HELP, ROLE_LABEL } from "@/lib/labels";

export function PermissionsDialog({ m, team, isOwner, onClose }: { m: Member | null; team: ReturnType<typeof useTeam>; isOwner: boolean; onClose: () => void }) {
  const [role, setRole] = useState<InviteRole>("member");
  const [perms, setPerms] = useState<Permissions>({});
  useEffect(() => { if (m) { setRole(m.role === "admin" ? "admin" : "member"); setPerms(m.permissions ?? {}); } }, [m]);
  const save = () => m && team.setAccess.mutate({ userId: m.user_id, role, permissions: role === "admin" ? {} : perms }, { onSuccess: onClose });
  return (
    <Dialog open={Boolean(m)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Permissões de {m?.full_name || m?.email}</DialogTitle>
          <DialogDescription>Vale na hora: o que sair da lista some da tela da pessoa.</DialogDescription>
        </DialogHeader>
        {isOwner && (
          <div className="grid gap-1.5">
            <Label htmlFor="pm-role">Papel</Label>
            <SimpleSelect id="pm-role" value={role} onChange={setRole} options={INVITE_ROLE_OPTIONS} />
            <p className="text-xs text-muted-foreground">{ROLE_HELP[role]}</p>
          </div>
        )}
        {role !== "admin" && <PermissionMatrix value={perms} onChange={setPerms} idPrefix="pm" />}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={team.setAccess.isPending}>Salvar permissões</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccessLists({ rows: all }: { rows: AccessEntry[] | null | undefined }) {
  if (all === null) return null;
  const rows = all ?? [];
  const mods = rows.filter((r) => r.kind === "modulo" && r.level !== "none");
  const items = rows.filter((r) => r.kind === "item");
  return (
    <div className="space-y-4 text-sm">
      <section aria-label="Módulos">
        <p className="brand-eyebrow mb-1.5">Módulos</p>
        {mods.length === 0 ? <p className="text-muted-foreground">Nenhum módulo inteiro.</p> : (
          <ul className="space-y-1">{mods.map((r) => <li key={r.key} className="flex justify-between gap-2"><span>{MODULE_LABEL[r.key as ModuleKey] ?? r.key}</span><Badge variant="secondary">{LEVEL_LABEL[r.level]}</Badge></li>)}</ul>
        )}
      </section>
      <section aria-label="Itens liberados">
        <p className="brand-eyebrow mb-1.5">Itens liberados individualmente</p>
        {items.length === 0 ? <p className="text-muted-foreground">Nenhum.</p> : (
          <ul className="space-y-1">{items.map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate"><span className="text-muted-foreground">{RESOURCE_LABEL[r.key.split(":")[0] as ResourceType]}:</span> {r.label ?? "(excluído)"}{r.restricted && <Lock className="ml-1 inline size-3" aria-label="restrito" />}</span>
              <Badge variant="secondary">{LEVEL_LABEL[r.level]}</Badge>
            </li>
          ))}</ul>
        )}
      </section>
    </div>
  );
}

/** Visão inversa: tudo que essa pessoa acessa na equipe. */
export function MemberAccessDialog({ ws, m, onClose }: { ws: string; m: Member | null; onClose: () => void }) {
  const q = useMemberAccess(ws, m ? m.user_id : null);
  const full = Boolean(m) && (m as Member).role !== "member" && (m as Member).role !== "viewer";
  const who = m ? m.full_name || m.email : "";
  return (
    <Dialog open={Boolean(m)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">O que {who} acessa</DialogTitle>
          <DialogDescription>{m ? ROLE_LABEL[m.role] : ""}{full ? " · vê e edita tudo da equipe" : ""}</DialogDescription>
        </DialogHeader>
        {q.isLoading ? <Skeleton className="h-24" /> : <AccessLists rows={full ? null : q.data} />}
      </DialogContent>
    </Dialog>
  );
}
