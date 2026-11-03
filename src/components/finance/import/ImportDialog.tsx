import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AccountFields, ImportSource } from "@/components/finance/import/ImportSource";
import { ImportPreview } from "@/components/finance/import/ImportPreview";
import { useImportFlow } from "@/hooks/useImportFlow";
import { brl } from "@/lib/format";
import { linesSummary } from "@/lib/statementImport";

/** Importar extrato: só ACRESCENTA o que é novo (nada é substituído nem apagado). */
export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const f = useImportFlow();
  const [step, setStep] = useState<"fonte" | "previa">("fonte");
  const close = (o: boolean) => { onOpenChange(o); if (!o) { setStep("fonte"); f.reset(); } };
  const s = linesSummary(f.toImport);
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] overflow-y-auto overflow-x-hidden sm:max-w-4xl [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle className="font-heading">Importar extrato</DialogTitle>
          <DialogDescription>
            O Superflow só acrescenta o que ainda não existe: importar o mesmo mês de novo não duplica nada.
            Transferências entre as suas contas viram transferência (não contam como receita nem despesa).
          </DialogDescription>
        </DialogHeader>
        {step === "fonte" ? <ImportSource f={f} onRead={() => setStep("previa")} /> : (
          <div className="space-y-3">
            <AccountFields f={f} />
            {f.checking ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Conferindo o que já foi importado…</p> : <ImportPreview f={f} />}
          </div>
        )}
        {step === "previa" && (
          <DialogFooter className="items-center gap-2 sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {f.toImport.length} novo(s): entradas {brl(s.entradas)} · saídas {brl(s.saidas)} · {s.transferencias} transferência(s)
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setStep("fonte"); f.reset(); }}>Voltar</Button>
              <Button disabled={!f.account || f.toImport.length === 0 || f.running || f.checking} onClick={() => f.submit(() => close(false))}>
                {f.running && <Loader2 className="size-4 animate-spin" />}Importar {f.toImport.length} lançamento(s)
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
