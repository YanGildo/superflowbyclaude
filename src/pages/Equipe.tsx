import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Save, ShieldCheck, Trash2, UserPlus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { SimpleSelect } from "@/components/common/RefSelect";
import { supabase } from "@/integrations/supabase/client";
import type { MemberRole } from "@/integrations/supabase/types";
import { useWorkspace } from "@/lib/workspace";
import { useAuth } from "@/lib/auth";

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Dono", admin: "Administrador", member: "Membro", viewer: "Só visualiza",
};
const ROLE_HELP: Record<Exclude<MemberRole, "owner">, string> = {
  admin: "Vê e edita tudo.",
  member: "Vê e edita tudo.",
  viewer: "Vê tudo, mas não altera nada.",
};

interface Member { user_id: string; full_name: string | null; email: string; role: MemberRole; joined_at: string }
interface Invite { id: string; email: string; role: MemberRole; accepted_at: string | null; created_at: string }

export default function Equipe() {
  const { workspace, isOwner, refresh } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  const ws = workspace!.id;
  const [name, setName] = useState(workspace?.name ?? "");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<MemberRole, "owner">>("member");

  useEffect(() => setName(workspace?.name ?? ""), [workspace?.name]);

  const members = useQuery({
    queryKey: ["members", ws],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_members", { _ws: ws });
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const invites = useQuery({
    queryKey: ["invites", ws],
    queryFn: async () => {
      const { data, error } = await supabase.from("workspace_invites").select("*")
        .eq("workspace_id", ws).is("accepted_at", null).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invite[];
    },
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["members", ws] });
    qc.invalidateQueries({ queryKey: ["invites", ws] });
  };

  const invite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("invite_member", { _ws: ws, _email: email, _role: role });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (r) => {
      toast.success(r === "adicionado"
        ? "Essa pessoa já tinha conta e entrou na equipe agora."
        : "Convite registrado. Quando a pessoa criar a conta com esse e-mail, entra direto aqui.");
      setEmail("");
      refreshAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, r }: { userId: string; r: MemberRole }) => {
      const { error } = await supabase.from("workspace_members").update({ role: r }).eq("workspace_id", ws).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Papel atualizado."); refreshAll(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("workspace_members").delete().eq("workspace_id", ws).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast("Pessoa removida da equipe."); refreshAll(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refreshAll,
  });

  const rename = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("workspaces").update({ name: name.trim() }).eq("id", ws);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Nome salvo."); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitInvite = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return toast.error("Digite um e-mail válido.");
    invite.mutate();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader eyebrow="Sistema" title="Equipe" description="Quem tem acesso a este workspace." />

      {isOwner && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nome do workspace</CardTitle>
            <CardDescription>Aparece para quem você convidar.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) rename.mutate(); }}>
              <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome do workspace" className="max-w-sm" />
              <Button type="submit" variant="secondary" disabled={!name.trim() || name.trim() === workspace?.name || rename.isPending}>
                <Save className="size-4" />Salvar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isOwner && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="size-4 text-primary" />Convidar pessoa</CardTitle>
            <CardDescription>
              Se a pessoa já tem conta no Superflow, entra na hora. Se não tem, basta ela criar a conta com este mesmo e-mail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitInvite} className="grid gap-3 sm:grid-cols-[1fr_190px_auto]" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="inv-email">E-mail</Label>
                <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-role">Acesso</Label>
                <SimpleSelect id="inv-role" value={role} onChange={setRole}
                  options={(["member", "admin", "viewer"] as const).map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
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
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><UsersRound className="size-4 text-primary" />Membros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.isLoading ? <Skeleton className="h-14 rounded-lg" /> : (members.data ?? []).map((m) => (
            <div key={m.user_id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {(m.full_name || m.email).slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.full_name || m.email}{m.user_id === user?.id && " (você)"}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              {m.role === "owner" || !isOwner ? (
                <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                  {m.role === "owner" && <ShieldCheck className="mr-1 size-3" />}{ROLE_LABEL[m.role]}
                </Badge>
              ) : (
                <>
                  <div className="w-40">
                    <SimpleSelect value={m.role} onChange={(r) => changeRole.mutate({ userId: m.user_id, r })}
                      options={(["member", "admin", "viewer"] as const).map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
                  </div>
                  <Button size="icon" variant="ghost" aria-label={`Remover ${m.email}`} className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeMember.mutate(m.user_id)}><Trash2 className="size-4" /></Button>
                </>
              )}
            </div>
          ))}

          {(invites.data ?? []).length > 0 && (
            <div className="pt-3">
              <p className="brand-eyebrow mb-2">Convites aguardando cadastro</p>
              {(invites.data ?? []).map((i) => (
                <div key={i.id} className="flex items-center gap-3 rounded-lg border border-dashed p-3">
                  <Mail className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{i.email}</span>
                  <Badge variant="outline">{ROLE_LABEL[i.role]}</Badge>
                  {isOwner && <Button size="sm" variant="ghost" onClick={() => cancelInvite.mutate(i.id)}>Cancelar</Button>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
