import { useState, type FormEvent } from "react";
import { Check, Copy, Link2, Loader2, Mail, MessageCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleSelect } from "@/components/common/RefSelect";
import { PermissionMatrix } from "@/components/team/PermissionMatrix";
import { inviteLink, type InviteRole, type useTeam } from "@/hooks/useTeam";
import type { Permissions } from "@/lib/access";
import { INVITE_ROLE_OPTIONS, ROLE_HELP } from "@/lib/labels";

/** Link pronto para mandar: copiar, WhatsApp ou e-mail. */
export function ShareLink({ token, team, email }: { token: string; team: string; email?: string | null }) {
  const [done, setDone] = useState(false);
  const url = inviteLink(token);
  const msg = `Te convidei para a equipe "${team}" no Superflow. Entra por este link: ${url}`;
  const copy = async () => {
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    setDone(true); toast.success("Link copiado."); setTimeout(() => setDone(false), 1500);
  };
  return (
    <div className="space-y-2">
      <Input readOnly value={url} aria-label="Link do convite" onFocus={(e) => e.target.select()} className="font-mono text-xs" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={copy}>{done ? <Check className="size-4" /> : <Copy className="size-4" />}Copiar link</Button>
        <Button size="sm" variant="outline" asChild><a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />WhatsApp</a></Button>
        <Button size="sm" variant="outline" asChild><a href={`mailto:${email ?? ""}?subject=${encodeURIComponent(`Convite: ${team} no Superflow`)}&body=${encodeURIComponent(msg)}`}><Mail className="size-4" />E-mail</a></Button>
      </div>
    </div>
  );
}

export function InviteCard({ team, teamName, isOwner }: { team: ReturnType<typeof useTeam>; teamName: string; isOwner: boolean }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("member");
  const [perms, setPerms] = useState<Permissions>({});
  const [token, setToken] = useState<{ t: string; email: string } | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return toast.error("Digite um e-mail válido (ou deixe vazio para gerar só o link).");
    team.invite.mutate({ email, role, permissions: role === "admin" ? {} : perms }, {
      onSuccess: (r) => { setToken(r.token ? { t: r.token, email: email.trim() } : null); setEmail(""); setPerms({}); },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="size-4 text-primary" />Convidar pessoa</CardTitle>
        <CardDescription>Defina o que a pessoa pode acessar e mande o link. Ela entra com a conta dela e continua com o espaço privado dela.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">E-mail (opcional)</Label>
              <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Vazio = link para qualquer pessoa (uso único)" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-role">Papel</Label>
              {isOwner ? <SimpleSelect id="inv-role" value={role} onChange={setRole} options={INVITE_ROLE_OPTIONS} /> : <Input id="inv-role" readOnly value="Membro" />}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{ROLE_HELP[role]}</p>
          {role !== "admin" && <PermissionMatrix value={perms} onChange={setPerms} idPrefix="inv" />}
          <Button type="submit" disabled={team.invite.isPending}>
            {team.invite.isPending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}Gerar convite
          </Button>
        </form>
        {token && (
          <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="text-sm font-medium">Convite pronto{token.email ? ` para ${token.email}` : ""}. Mande este link (vale 14 dias, uso único):</p>
            <ShareLink token={token.t} team={teamName} email={token.email} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
