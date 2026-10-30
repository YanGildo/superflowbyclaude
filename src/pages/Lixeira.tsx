import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { useScope } from "@/hooks/useScope";
import { useTrash } from "@/hooks/useTrash";

const PURGE_DAYS = 30;

export default function Lixeira() {
  const { wsId, ready } = useScope();
  const { items: { data = [], isLoading }, restore, destroy } = useTrash(wsId, ready);

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
