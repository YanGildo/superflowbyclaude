import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRenameWorkspace } from "@/hooks/useTeam";

export function WorkspaceNameCard({ ws, current, onSaved }: { ws: string; current: string | undefined; onSaved: () => void }) {
  const [name, setName] = useState(current ?? "");
  const rename = useRenameWorkspace(ws, onSaved);

  useEffect(() => setName(current ?? ""), [current]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Nome do workspace</CardTitle>
        <CardDescription>Aparece para quem você convidar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) rename.mutate(name); }}>
          <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome do workspace" className="max-w-sm" />
          <Button type="submit" variant="secondary" disabled={!name.trim() || name.trim() === current || rename.isPending}>
            <Save className="size-4" />Salvar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
