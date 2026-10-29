import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { supabase } from "@/integrations/supabase/client";
import type { Business, BusinessKind, Profile } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace";
import { CategoriesManager } from "@/components/finance/CategoriesManager";

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
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles")
        .update({ full_name: fullName.trim() || null, phone: phone.trim() || null }).eq("id", user!.id);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Perfil salvo."); },
    onError: (e: Error) => toast.error(`Não salvou: ${e.message}`),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Perfil</CardTitle>
        <CardDescription>{user?.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid max-w-md gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
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

  const update = useMutation({
    mutationFn: async (patch: Partial<Business>) => {
      const { error } = await supabase.from("businesses").update(patch).eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message.includes("duplicate") ? "Já existe um negócio com esse nome." : e.message),
  });

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

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("businesses").insert({
        workspace_id: workspace!.id, name: name.trim(), kind,
        color: COLORS[businesses.length % COLORS.length], position: businesses.length,
      });
      if (error) throw error;
    },
    onSuccess: () => { setName(""); refresh(); toast.success("Negócio criado."); },
    onError: (e: Error) => toast.error(e.message.includes("duplicate") ? "Já existe um negócio com esse nome." : e.message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Dê um nome ao negócio.");
    create.mutate();
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

export default function Configuracoes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Negócios, categorias financeiras e perfil.</p>
      </div>
      <Tabs defaultValue="negocios">
        <TabsList>
          <TabsTrigger value="negocios">Negócios</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
        </TabsList>
        <TabsContent value="negocios" className="mt-4"><BusinessesTab /></TabsContent>
        <TabsContent value="categorias" className="mt-4"><CategoriesManager /></TabsContent>
        <TabsContent value="perfil" className="mt-4"><ProfileTab /></TabsContent>
      </Tabs>
    </div>
  );
}
