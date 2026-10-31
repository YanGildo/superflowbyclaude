import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Archive, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Business, BusinessKind } from "@/integrations/supabase/types";
import { useCreateBusiness, useProfile, useUpdateBusiness } from "@/hooks/useSettings";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace";
import { CategoriesManager } from "@/components/finance/CategoriesManager";
import { AppearanceTab } from "@/components/settings/AppearanceTab";

const KINDS: { value: BusinessKind; label: string }[] = [
  { value: "pessoal", label: "Pessoal" },
  { value: "agencia", label: "Agência" },
  { value: "saas", label: "SaaS" },
  { value: "infoproduto", label: "Infoproduto" },
  { value: "servico", label: "Serviço" },
  { value: "telegram", label: "Vendas Telegram" },
  { value: "outro", label: "Outro" },
];

const COLORS = ["#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626", "#db2777", "#0891b2", "#475569"];

function ProfileTab() {
  const { user } = useAuth();
  const { profile: { data: profile, isLoading }, save } = useProfile(user?.id);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Perfil</CardTitle>
        <CardDescription>{user?.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid max-w-md gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate({ fullName, phone }); }}>
          <div className="space-y-1.5">
            <Label htmlFor="pf-name">Nome</Label>
            <Input id="pf-name" value={fullName} disabled={isLoading} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-phone">WhatsApp</Label>
            <Input id="pf-phone" value={phone} disabled={isLoading} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button type="submit" className="w-fit" disabled={save.isPending}>
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Salvar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function BusinessRow({ b }: { b: Business }) {
  const { refresh } = useWorkspace();
  const [name, setName] = useState(b.name);
  const [kind, setKind] = useState<BusinessKind>(b.kind);
  const [color, setColor] = useState(b.color ?? COLORS[7]);
  const dirty = name.trim() !== b.name || kind !== b.kind || color !== (b.color ?? COLORS[7]);

  const update = useUpdateBusiness(b.id, refresh);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
      <input
        type="color" aria-label="Cor" value={color} onChange={(e) => setColor(e.target.value)}
        className="size-8 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <Input className="h-9 min-w-[160px] flex-1" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome do negócio" />
      <Select value={kind} onValueChange={(v) => setKind(v as BusinessKind)}>
        <SelectTrigger className="h-9 w-[160px]" aria-label="Tipo"><SelectValue /></SelectTrigger>
        <SelectContent>{KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
      </Select>
      <Button size="sm" variant="secondary" disabled={!dirty || !name.trim() || update.isPending}
        onClick={() => update.mutate({ name: name.trim(), kind, color }, { onSuccess: () => toast.success("Negócio salvo.") })}>
        Salvar
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Arquivar"><Archive className="size-4" /></Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar "{b.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Some do seletor de negócios. Os registros ligados a ele continuam salvos e aparecem em "Todos os negócios".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => update.mutate({ archived_at: new Date().toISOString() })}>Arquivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BusinessesTab() {
  const { workspace, businesses, refresh } = useWorkspace();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<BusinessKind>("agencia");

  const create = useCreateBusiness(workspace?.id, () => { setName(""); refresh(); });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Dê um nome ao negócio.");
    create.mutate({ name: name.trim(), kind, color: COLORS[businesses.length % COLORS.length], position: businesses.length });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Negócios</CardTitle>
        <CardDescription>
          Cada registro (tarefa, cliente, lançamento, venda) pode ser marcado com um negócio. O seletor no topo filtra o sistema inteiro.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {businesses.map((b) => <BusinessRow key={b.id} b={b} />)}
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2">
          <Input className="h-9 min-w-[160px] flex-1" placeholder="Novo negócio (ex.: RG Marketing)" value={name}
            onChange={(e) => setName(e.target.value)} aria-label="Nome do novo negócio" />
          <Select value={kind} onValueChange={(v) => setKind(v as BusinessKind)}>
            <SelectTrigger className="h-9 w-[160px]" aria-label="Tipo do novo negócio"><SelectValue /></SelectTrigger>
            <SelectContent>{KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="submit" size="sm" disabled={create.isPending}>
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Adicionar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const TAB_IDS = ["negocios", "categorias", "perfil", "aparencia"];

export default function Configuracoes() {
  const [params, setParams] = useSearchParams();
  const tab = TAB_IDS.includes(params.get("aba") ?? "") ? (params.get("aba") as string) : "negocios";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Negócios, categorias financeiras, perfil e aparência.</p>
      </div>
      <Tabs value={tab} onValueChange={(v) => setParams((p) => { p.set("aba", v); return p; }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="negocios">Negócios</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
        </TabsList>
        <TabsContent value="negocios" className="mt-4"><BusinessesTab /></TabsContent>
        <TabsContent value="categorias" className="mt-4"><CategoriesManager /></TabsContent>
        <TabsContent value="perfil" className="mt-4"><ProfileTab /></TabsContent>
        <TabsContent value="aparencia" className="mt-4"><AppearanceTab /></TabsContent>
      </Tabs>
    </div>
  );
}
