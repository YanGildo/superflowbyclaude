import { useState, type FormEvent } from "react";
import { Loader2, Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleSelect } from "@/components/common/RefSelect";
import type { InviteRole, useTeam } from "@/hooks/useTeam";
import { INVITE_ROLE_OPTIONS, ROLE_HELP } from "@/lib/labels";

export function InviteCard({ invite }: { invite: ReturnType<typeof useTeam>["invite"] }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("member");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return toast.error("Digite um e-mail válido.");
    invite.mutate({ email, role }, { onSuccess: () => setEmail("") });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="size-4 text-primary" />Convidar pessoa</CardTitle>
        <CardDescription>
          Se a pessoa já tem conta no Superflow, entra na hora. Se não tem, basta ela criar a conta com este mesmo e-mail.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_190px_auto]" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="inv-email">E-mail</Label>
            <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@email.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-role">Acesso</Label>
            <SimpleSelect id="inv-role" value={role} onChange={setRole} options={INVITE_ROLE_OPTIONS} />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={invite.isPending} className="w-full">
              {invite.isPending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}Convidar
            </Button>
          </div>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">{ROLE_HELP[role]} O Superflow não envia e-mail: avise a pessoa você mesmo.</p>
      </CardContent>
    </Card>
  );
}
