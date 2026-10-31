import { Link } from "react-router-dom";
import { Plug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const SOURCES = ["Meta Ads", "Google Ads", "Google Analytics"];

/** Status das conexões com as plataformas (entram na fase de Integrações). */
export function ConnectionsBar() {
  const soon = () => toast("A conexão com Meta e Google entra na fase de Integrações. Por enquanto, preencha os números na campanha.");
  return (
    <Card className="flex flex-wrap items-center gap-3 p-3">
      <div className="flex flex-wrap gap-2">
        {SOURCES.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">
            <span className="size-2 rounded-full bg-muted-foreground/40" />{s}<span className="text-muted-foreground">· não conectado</span>
          </span>
        ))}
      </div>
      <div className="ml-auto flex gap-2">
        <Button variant="ghost" size="sm" asChild><Link to="/integracoes">Ver integrações</Link></Button>
        <Button size="sm" variant="outline" onClick={soon}><Plug className="size-4" />Conectar Meta / Google</Button>
      </div>
    </Card>
  );
}
