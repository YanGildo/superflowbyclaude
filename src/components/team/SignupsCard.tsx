import { useState } from "react";
import { Check, ShieldCheck, Undo2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAppAdmin, useSignups, type Approval, type Signup } from "@/hooks/useApproval";
import { cn } from "@/lib/utils";

const LABEL: Record<Approval, { text: string; tone: string }> = {
  pending: { text: "Aguardando", tone: "bg-warning/15 text-warning" },
  approved: { text: "Liberado", tone: "bg-success/15 text-success" },
  rejected: { text: "Recusado", tone: "bg-destructive/10 text-destructive" },
};
const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function Row({ s, set }: { s: Signup; set: (status: Approval) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{s.full_name || s.email}</p>
        <p className="truncate text-xs text-muted-foreground">{s.email} · {when(s.created_at)}{s.via_invite ? " · entrou por convite" : ""}</p>
      </div>
      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", LABEL[s.approval].tone)}>{LABEL[s.approval].text}</span>
      {s.approval !== "approved" && <Button size="sm" onClick={() => set("approved")} aria-label={`Liberar ${s.email}`}><Check className="size-4" />Liberar</Button>}
      {s.approval === "pending" && <Button size="sm" variant="outline" onClick={() => set("rejected")} aria-label={`Recusar ${s.email}`}><X className="size-4" />Recusar</Button>}
      {s.approval === "approved" && <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => window.confirm(`Bloquear o acesso de ${s.email}?`) && set("rejected")} aria-label={`Bloquear ${s.email}`}><Undo2 className="size-4" />Bloquear</Button>}
    </div>
  );
}

/** Só para o administrador do Superflow: quem se cadastrou e o botão de liberar. */
export function SignupsCard() {
  const admin = useIsAppAdmin();
  const { list, set } = useSignups(Boolean(admin.data));
  const [all, setAll] = useState(false);
  if (!admin.data) return null;
  const rows = list.data ?? [];
  const pending = rows.filter((s) => s.approval === "pending");
  const shown = all ? rows : pending;
  return (
    <Card className={cn(pending.length > 0 && "border-warning/50")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-primary" />Novos cadastros
          {pending.length > 0 && <Badge className="bg-warning text-warning-foreground hover:bg-warning">{pending.length} aguardando</Badge>}
        </CardTitle>
        <CardDescription>O cadastro fica aberto, mas quem se cadastra sozinho só entra depois que você liberar. Quem usa um link de convite seu entra direto.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {list.isLoading ? <Skeleton className="h-14" /> : shown.length === 0
          ? <p className="text-sm text-muted-foreground">{all ? "Nenhum cadastro." : "Ninguém aguardando."}</p>
          : shown.map((s) => <Row key={s.user_id} s={s} set={(status) => set.mutate({ userId: s.user_id, status })} />)}
        <Button size="sm" variant="ghost" onClick={() => setAll((x) => !x)}>{all ? "Mostrar só os pendentes" : `Ver todos os cadastros (${rows.length})`}</Button>
      </CardContent>
    </Card>
  );
}

/** Aviso no topo para o administrador quando alguém está esperando liberação. */
export function PendingSignupsBanner() {
  const admin = useIsAppAdmin();
  const { list } = useSignups(Boolean(admin.data));
  const n = (list.data ?? []).filter((s) => s.approval === "pending").length;
  if (!admin.data || n === 0) return null;
  return (
    <a href="/equipe" className="block bg-warning/15 px-4 py-1.5 text-center text-xs font-medium text-warning hover:underline">
      {n} cadastro(s) aguardando sua liberação · abrir Equipe
    </a>
  );
}
