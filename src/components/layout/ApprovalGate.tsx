import type { ReactNode } from "react";
import { Clock, XCircle } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMyApproval } from "@/hooks/useApproval";
import { useAuth } from "@/lib/auth";

/** Conta nova sem convite espera a liberação do administrador antes de entrar no sistema. */
export function ApprovalGate({ children, loader }: { children: ReactNode; loader: ReactNode }) {
  const { user, signOut } = useAuth();
  const q = useMyApproval();
  if (q.isLoading) return <>{loader}</>;
  if (q.isError || q.data === "approved") return <>{children}</>;
  const rejected = q.data === "rejected";
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 p-6 text-center">
          <BrandMark className="mx-auto size-11" />
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            {rejected ? <XCircle className="size-6 text-destructive" /> : <Clock className="size-6 text-primary" />}
          </span>
          <h1 className="font-heading text-lg font-semibold">{rejected ? "Acesso não liberado" : "Cadastro recebido"}</h1>
          <p className="text-sm text-muted-foreground">
            {rejected
              ? "Seu cadastro não foi aprovado. Se acha que é engano, fale com quem te indicou o Superflow."
              : "Sua conta foi criada e está aguardando liberação. Assim que for aprovada, esta tela abre sozinha. Se você recebeu um link de convite, abra o link de novo para entrar direto."}
          </p>
          <p className="text-xs text-muted-foreground">Conta: {user?.email}</p>
          <Button variant="outline" className="w-full" onClick={() => { void signOut(); }}>Sair</Button>
        </CardContent>
      </Card>
    </div>
  );
}
