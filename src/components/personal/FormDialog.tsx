import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { cn } from "@/lib/utils";
import { fromForm, toForm, type Field, type FormValues } from "@/lib/formFields";

function FieldInput({ f, value, set }: { f: Field; value: string; set: (v: string) => void }) {
  const id = `ff-${f.key}`;
  if (f.type === "textarea") return <Textarea id={id} value={value} onChange={(e) => set(e.target.value)} rows={f.rows ?? 3} placeholder={f.placeholder} />;
  if (f.type === "select") return <SimpleSelect id={id} value={value} onChange={set} options={f.options ?? []} />;
  if (f.type === "ref") return <RefSelect id={id} value={value || null} onChange={(v) => set(v ?? "")} options={f.refs ?? []} placeholder={f.placeholder ?? "Nenhum"} />;
  return (
    <Input id={id} type={f.type === "number" ? "text" : f.type ?? "text"} inputMode={f.type === "number" ? "decimal" : undefined}
      value={value} onChange={(e) => set(e.target.value)} placeholder={f.placeholder} className="h-9" />
  );
}

/** Formulário genérico em janela: campos por configuração, salvar e (opcional) excluir. */
export function FormDialog({ open, onOpenChange, title, description, fields, initial, onSubmit, onDelete, pending, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; fields: Field[];
  initial?: object | null; onSubmit: (v: Record<string, unknown>) => unknown;
  onDelete?: () => void; pending?: boolean; children?: ReactNode;
}) {
  const [values, setValues] = useState<FormValues>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setValues(toForm(fields, initial as Record<string, unknown> | null)); setError(null); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const missing = fields.find((f) => f.required && !values[f.key]?.trim());
    if (missing) return setError(`Preencha: ${missing.label}.`);
    await onSubmit(fromForm(fields, values));
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3" noValidate>
          {fields.map((f) => (
            <div key={f.key} className={cn("space-y-1.5", f.half ? "col-span-1" : "col-span-2")}>
              <Label htmlFor={`ff-${f.key}`}>{f.label}{f.required ? " *" : ""}</Label>
              <FieldInput f={f} value={values[f.key] ?? ""} set={(v) => setValues((p) => ({ ...p, [f.key]: v }))} />
              {f.help && <p className="text-[11px] text-muted-foreground">{f.help}</p>}
            </div>
          ))}
          {children && <div className="col-span-2">{children}</div>}
          {error && <p className="col-span-2 text-sm text-destructive">{error}</p>}
          <DialogFooter className="col-span-2 gap-2 sm:justify-between">
            {onDelete ? <Button type="button" variant="ghost" className="text-destructive" onClick={() => { if (window.confirm("Excluir este registro?")) { onDelete(); onOpenChange(false); } }}><Trash2 className="size-4" />Excluir</Button> : <span />}
            <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
