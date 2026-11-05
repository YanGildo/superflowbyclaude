import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, UsersRound } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAcceptInvite, useInvitePreview } from "@/hooks/useTeam";
import { useAuth } from "@/lib/auth";
import { pendingInvite } from "@/lib/invite";
import { prefs } from "@/lib/workspace";

function Actions({ token, valid }: { token: string; valid: boolean }) {
  const { user, signOut } = useAuth();
  const accept = useAcceptInvite();
  const qc = useQueryClient();
  const navigate = useNavigate();

  if (!valid) return <Button asChild variant="outline" className="w-full"><Link to="/">Ir para o Superflow</Link></Button>;
  if (!user) {
    return (
      <div className="grid gap-2">
        <Button asChild className="w-full"><Link to="/login?convite=1&modo=criar">Criar minha conta e entrar</Link></Button>
        <Button asChild variant="outline" className="w-full"><Link to="/login?convite=1">Já tenho conta: entrar</Link></Button>
      </div>
    );
  }
  const go = () => accept.mutate(token, {
    onSuccess: async (ws) => {
      pendingInvite.clear(); prefs.saveWorkspace(ws);
      await qc.invalidateQueries();
      navigate("/", { replace: true });
    },
  });
  return (
    <div className="grid gap-2">
      {accept.error && <Alert variant="destructive"><AlertDescription>{(accept.error as Error).message}</AlertDescription></Alert>}
      <Button className="w-full" onClick={go} disabled={accept.isPending}>{accept.isPending && <Loader2 className="size-4 animate-spin" />}Aceitar convite</Button>
      <p className="text-center text-xs text-muted-foreground">
        Entrando como {user.email}. <button className="underline" onClick={() => { void signOut(); }}>Usar outra conta</button>
      </p>
    </div>
  );
}

/** Página aberta pelo link de convite: mostra a equipe e leva para entrar/criar conta e aceitar. */
export default function Convite() {
  const { token = "" } = useParams();
  const preview = useInvitePreview(token);
  const inv = preview.data;

  useEffect(() => { if (token) pendingInvite.save(token); }, [token]);
  useEffect(() => { if (preview.isSuccess && !inv?.valid) pendingInvite.clear(); }, [preview.isSuccess, inv]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <BrandMark className="mb-2 size-11" />
          <CardTitle className="font-heading text-xl">Convite para equipe</CardTitle>
          <CardDescription>
            {preview.isLoading ? "Carregando…" : inv
              ? <><strong>{inv.invited_by_name}</strong> chamou você para a equipe <strong>{inv.workspace_name}</strong> no Superflow.</>
              : "Convite não encontrado. Confira o link."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {inv && !inv.valid && <Alert variant="destructive"><AlertDescription>Este convite já foi usado ou expirou. Peça um novo link.</AlertDescription></Alert>}
          {inv?.valid && (
            <div className="flex gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              <UsersRound className="size-4 shrink-0 text-primary" />
              <span>Sua conta continua sua: você ganha seu espaço privado e vê da equipe só o que for liberado para você.{inv.email && <> Convite para <strong>{inv.email}</strong>.</>}</span>
            </div>
          )}
          {!preview.isLoading && <Actions token={token} valid={Boolean(inv?.valid)} />}
        </CardContent>
      </Card>
    </div>
  );
}
