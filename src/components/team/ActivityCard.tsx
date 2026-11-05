import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivity, type ActivityEntry, type Member } from "@/hooks/useTeam";
import { MODULE_LABEL, type ModuleKey } from "@/lib/access";

const ENTITY: Record<string, string> = {
  tasks: "a tarefa", projects: "o projeto", scripts: "o script", prospects: "o prospect", action_plans: "o plano",
  action_plan_steps: "a etapa", action_plan_assets: "o material", goals: "a meta", funnels: "o funil", contacts: "o contato",
  deals: "a negociação", proposals: "a proposta", content_items: "o conteúdo", deliveries: "a entrega",
  transactions: "o lançamento", payables: "a conta a pagar", receivables: "a conta a receber",
};

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Quem fez o quê na equipe (só aparece o que você tem acesso). */
export function ActivityCard({ ws, members }: { ws: string; members: Member[] }) {
  const q = useActivity(ws);
  const nameOf = (a: ActivityEntry) => {
    const m = members.find((x) => x.user_id === a.user_id);
    return m ? (m.full_name || m.email) : (a.actor_name ?? "Alguém");
  };
  const list = q.data ?? [];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><History className="size-4 text-primary" />Histórico da equipe</CardTitle>
      </CardHeader>
      <CardContent>
        {q.isLoading ? <Skeleton className="h-20" /> : list.length === 0 ? <p className="text-sm text-muted-foreground">Nada ainda.</p> : (
          <ol className="space-y-2" aria-label="Histórico">
            {list.map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="w-20 shrink-0 text-xs text-muted-foreground">{when(a.created_at)}</span>
                <span className="min-w-0">
                  <strong className="font-medium">{nameOf(a)}</strong> {a.action}{" "}
                  {a.entity_type !== "workspace_members" && <span className="text-muted-foreground">{ENTITY[a.entity_type] ?? ""} </span>}
                  {a.title && <span className="font-medium">{a.title}</span>}
                  {a.module !== "equipe" && <span className="ml-1 text-xs text-muted-foreground">· {MODULE_LABEL[a.module as ModuleKey] ?? a.module}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
