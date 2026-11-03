import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileUp, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { readStatementFile, type ImportFlow } from "@/hooks/useImportFlow";
import type { UseType } from "@/integrations/supabase/types";

export function AccountFields({ f }: { f: ImportFlow }) {
  if (f.accounts.length === 0) {
    return (
      <Alert><AlertDescription>
        Primeiro crie a conta do banco em <Link className="font-medium text-primary underline" to="/financeiro/carteira">Carteira → Contas</Link> (ex.: “Nubank PJ”, “Nubank Pessoal”).
      </AlertDescription></Alert>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="grid gap-1.5"><Label>Conta do extrato</Label>
        <Select value={f.accountId} onValueChange={f.setAccountId}>
          <SelectTrigger aria-label="Conta do extrato"><SelectValue placeholder="Escolha a conta" /></SelectTrigger>
          <SelectContent>{f.accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5"><Label>Uso</Label>
        <Select value={f.useType} onValueChange={(v) => f.setUseType(v as UseType)}>
          <SelectTrigger aria-label="Uso"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="pessoal">Pessoal</SelectItem><SelectItem value="negocio">Negócio</SelectItem><SelectItem value="misto">Misto</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5"><Label htmlFor="imp-holder">Seu nome no banco</Label>
        <Input id="imp-holder" value={f.holder ?? ""} onChange={(e) => f.setHolder(e.target.value)} placeholder="Ex.: Yan Gildo Moura França" />
      </div>
    </div>
  );
}

export function ImportSource({ f, onRead }: { f: ImportFlow; onRead: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const go = (t: string) => {
    const p = f.read(t);
    if (p.rows.length === 0) { setError("Não achei movimentações nesse conteúdo. Envie o PDF do extrato ou o CSV/OFX do banco."); return; }
    setError(""); onRead();
  };
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try { go(await readStatementFile(file)); } catch { setError("Não consegui abrir esse arquivo."); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <AccountFields f={f} />
      <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center"
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void onFile(e.dataTransfer.files[0]); }}>
        <FileUp className="size-8 text-primary" />
        <p className="text-sm font-medium">Arraste o extrato aqui ou escolha o arquivo</p>
        <p className="text-xs text-muted-foreground">PDF do Nubank (mais preciso), CSV ou OFX de qualquer banco.</p>
        <input ref={input} type="file" accept=".pdf,.csv,.ofx,.txt" className="hidden" aria-label="Arquivo do extrato" onChange={(e) => void onFile(e.target.files?.[0])} />
        <Button size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}Escolher arquivo
        </Button>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="imp-text">…ou cole aqui o texto do extrato (Ctrl+C / Ctrl+V)</Label>
        <Textarea id="imp-text" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Cole o texto copiado do extrato ou o conteúdo do CSV" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end"><Button disabled={!f.accountId || !text.trim()} onClick={() => go(text)}>Ler extrato colado</Button></div>
    </div>
  );
}
