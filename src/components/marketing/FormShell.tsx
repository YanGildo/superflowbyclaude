import type { FormEvent, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Casca de diálogo com formulário em 2 colunas, erro e botões. */
export function FormShell({
  open, onOpenChange, title, description, onSubmit, error, pending, children, submitLabel = "Salvar",
}: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; onSubmit: () => void;
  error: string | null; pending: boolean; children: ReactNode; submitLabel?: string;
}) {
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit(); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
          {children}
          {error && <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ id, label, wide, children }: { id: string; label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cn("space-y-1.5", wide && "sm:col-span-2")}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export function TextField({ id, label, value, onChange, wide, type = "text", placeholder, autoFocus }: {
  id: string; label: string; value: string; onChange: (v: string) => void; wide?: boolean; type?: string; placeholder?: string; autoFocus?: boolean;
}) {
  return (
    <Field id={id} label={label} wide={wide}>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} />
    </Field>
  );
}

export function AreaField({ id, label, value, onChange, rows = 2, placeholder, wide = true }: {
  id: string; label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; wide?: boolean;
}) {
  return (
    <Field id={id} label={label} wide={wide}>
      <Textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </Field>
  );
}
