import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useScope } from "@/hooks/useScope";

/** Tabelas que têm lixeira (deleted_at) e a coluna usada como nome. */
const SOURCES = [
  { table: "tasks", label: "Tarefa", name: "title" },
  { table: "task_lists", label: "Lista", name: "name" },
  { table: "projects", label: "Projeto", name: "name" },
  { table: "goals", label: "Meta", name: "title" },
  { table: "funnels", label: "Funil", name: "name" },
  { table: "contacts", label: "Contato", name: "name" },
  { table: "proposals", label: "Proposta", name: "title" },
  { table: "transactions", label: "Lançamento", name: "description" },
] as const;

interface TrashItem { table: string; label: string; id: string; name: string; deleted_at: string }
const PURGE_DAYS = 30;

export default function Lixeira() {
  const { wsId, ready } = useScope();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["trash", wsId],
    enabled: ready,
    queryFn: async () => {
      const results = await Promise.all(SOURCES.map(async (s) => {
        const { data: rows, error } = await supabase.from(s.table)
          .select(`id, ${s.name}, deleted_at`).eq("workspace_id", wsId).not("deleted_at", "is", null);
        if (error) throw error;
        return ((rows ?? []) as unknown as Record<string, string>[]).map((r) => ({
          table: s.table, label: s.label, id: r.id, name: r[s.name] ?? "(sem nome)", deleted_at: r.deleted_at,
        }));
      }));
      return results.flat().sort((a, b) => b.deleted_at.localeCompare(a.deleted_at)) as TrashItem[];
    },
  });

  const invalidate = () => qc.invalidateQueries();

  const restore = useMutation({
    mutationFn: async (i: TrashItem) => {
      const { error } = await supabase.from(i.table).update({ deleted_at: null }).eq("id", i.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Restaurado."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const destroy = useMutation({
    mutationFn: async (items: TrashItem[]) => {
      for (const i of items) {
        const { error } = await supabase.from(i.table).delete().eq("id", i.id);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast("Excluído de vez."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const daysLeft = (iso: string) => Math.max(0, PURGE_DAYS - Math.floor((Date.now() - new Date(iso).getTime()) / 864e5));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Sistema" title="Lixeira"
        description={`Itens excluídos ficam aqui por ${PURGE_DAYS} dias. Depois são apagados automaticamente.`}
        actions={data.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" className="text-destructive"><Trash2 className="size-4" />Esvaziar lixeira</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Esvaziar a lixeira?</AlertDialogTitle>
                <AlertDialogDescription>{data.length} itens serão apagados para sempre. Não dá para desfazer.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => destroy.mutate(data)}>Apagar tudo</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )} />

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : data.length === 0 ? (
        <EmptyState icon={Trash2} title="Lixeira vazia" description="O que você excluir aparece aqui e pode ser restaurado." />
      ) : (
        <div className="space-y-1.5">
          {data.map((i) => (
            <div key={`${i.table}-${i.id}`} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
              <Badge variant="secondary" className="w-24 justify-center">{i.label}</Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{i.name}</p>
                <p className="text-xs text-muted-foreground">
                  Excluído em {new Date(i.deleted_at).toLocaleDateString("pt-BR")} · {daysLeft(i.deleted_at) > 0 ? `apaga em ${daysLeft(i.deleted_at)} dias` : "será apagado em breve"}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => restore.mutate(i)} aria-label={`Restaurar ${i.name}`}>
                <RotateCcw className="size-4" />Restaurar
              </Button>
              <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" aria-label={`Apagar de vez ${i.name}`}
                onClick={() => destroy.mutate([i])}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
