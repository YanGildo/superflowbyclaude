import { useState } from "react";
import { Bookmark, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCrmMutations } from "@/hooks/useCrm";
import { useRefAccounts, useRefPosts } from "@/hooks/useContent";
import type { ReferenceAccount, ReferencePost } from "@/integrations/supabase/types";
import { FORMATS, fmtNum, multiple, multipleBadge } from "@/lib/content";
import { scoreHook } from "@/lib/hookScore";
import { cn } from "@/lib/utils";
import { Choice, Empty, Field, LinkOut } from "./ContentBits";

const GROUPS = [{ value: "diretas", label: "Diretas" }, { value: "vizinhas", label: "Vizinhas (mesmo público)" }, { value: "grandes", label: "Grandes (só formato)" }];
const num = (v: string) => (v.trim() ? Number(v.replace(/\D/g, "")) : null);

function NewAccount() {
  const { save } = useCrmMutations("reference_accounts");
  const [f, setF] = useState({ handle: "", followers: "", median: "", grp: "diretas" });
  const submit = () => save.mutate({ handle: f.handle.trim().replace(/^@?/, "@"), followers: num(f.followers), median_views: num(f.median), grp: f.grp },
    { onSuccess: () => setF({ handle: "", followers: "", median: "", grp: f.grp }) });
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_120px_160px_190px_auto] sm:items-end">
      <Field id="ra-handle" label="Conta"><Input id="ra-handle" value={f.handle} onChange={(e) => setF({ ...f, handle: e.target.value })} placeholder="@perfil" /></Field>
      <Field id="ra-followers" label="Seguidores"><Input id="ra-followers" inputMode="numeric" value={f.followers} onChange={(e) => setF({ ...f, followers: e.target.value })} /></Field>
      <Field id="ra-median" label="Mediana (12 reels)"><Input id="ra-median" inputMode="numeric" value={f.median} onChange={(e) => setF({ ...f, median: e.target.value })} /></Field>
      <Field id="ra-grp" label="Grupo"><Choice id="ra-grp" value={f.grp} onChange={(v) => setF({ ...f, grp: v })} options={GROUPS} /></Field>
      <Button onClick={submit} disabled={!f.handle.trim()}><Plus className="size-4" />Conta</Button>
    </div>
  );
}

function NewPost({ accounts }: { accounts: ReferenceAccount[] }) {
  const { save } = useCrmMutations("reference_posts");
  const empty = { account: accounts[0]?.id ?? "", views: "", hook: "", format: "Reels", link: "", date: "" };
  const [f, setF] = useState(empty);
  const submit = () => save.mutate({ account_id: f.account || accounts[0]?.id, views: num(f.views), hook: f.hook.trim() || null, format: f.format, link: f.link.trim() || null, posted_on: f.date || null },
    { onSuccess: () => setF({ ...empty, account: f.account }) });
  if (!accounts.length) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <Field id="rp-acc" label="Conta"><Choice id="rp-acc" value={f.account || accounts[0].id} onChange={(v) => setF({ ...f, account: v })} options={accounts.map((a) => ({ value: a.id, label: a.handle }))} /></Field>
      <Field id="rp-views" label="Views do reel"><Input id="rp-views" inputMode="numeric" value={f.views} onChange={(e) => setF({ ...f, views: e.target.value })} /></Field>
      <Field id="rp-format" label="Formato"><Choice id="rp-format" value={f.format} onChange={(v) => setF({ ...f, format: v })} options={FORMATS} /></Field>
      <Field id="rp-date" label="Data"><Input id="rp-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
      <Field id="rp-hook" label="Gancho exatamente como foi falado" className="sm:col-span-3"><Input id="rp-hook" value={f.hook} onChange={(e) => setF({ ...f, hook: e.target.value })} /></Field>
      <Field id="rp-link" label="Link"><Input id="rp-link" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} /></Field>
      <Button className="w-fit" onClick={submit} disabled={!f.views.trim() && !f.hook.trim()}><Plus className="size-4" />Reel</Button>
    </div>
  );
}

function PostRow({ p, acc }: { p: ReferencePost; acc?: ReferenceAccount }) {
  const hooks = useCrmMutations("hooks");
  const { remove } = useCrmMutations("reference_posts");
  const m = multiple(p.views, acc?.median_views ?? null);
  const badge = multipleBadge(m);
  const toVault = () => {
    const r = scoreHook(p.hook ?? "");
    hooks.save.mutate({ text: p.hook, views: p.views, source: acc ? acc.handle : null, link: p.link, kind: p.format, score: r.score, verdict: r.verdict, weakest: r.weakest },
      { onSuccess: () => toast.success("Salvo no banco de ganchos.") });
  };
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-lg border p-2.5 text-sm", badge.note === " · sinal" && "border-success/50 bg-success/5")}>
      <span className={cn("w-14 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold", badge.tone)}>{badge.text}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{p.hook ?? "(sem gancho)"}</p>
        <p className="text-xs text-muted-foreground">{[acc?.handle, `${fmtNum(p.views)} views`, p.format, p.posted_on?.split("-").reverse().join("/")].filter(Boolean).join(" · ")}{badge.note}</p>
      </div>
      <LinkOut href={p.link}>Ver</LinkOut>
      {p.hook && <Button size="sm" variant="outline" onClick={toVault}><Bookmark className="size-4" />Salvar no banco de ganchos</Button>}
      <Button size="icon" variant="ghost" className="size-8 hover:text-destructive" aria-label="Apagar reel" onClick={() => remove.mutate(p.id)}><Trash2 className="size-4" /></Button>
    </div>
  );
}

/** Referências (concorrentes): entrada manual; múltiplo = views ÷ mediana da conta. */
export function ReferencesTab() {
  const { data: accounts = [] } = useRefAccounts();
  const { data: posts = [] } = useRefPosts();
  const acc = useCrmMutations("reference_accounts");
  const sorted = [...posts].sort((a, b) => (multiple(b.views, accounts.find((x) => x.id === b.account_id)?.median_views ?? null) ?? 0) - (multiple(a.views, accounts.find((x) => x.id === a.account_id)?.median_views ?? null) ?? 0));
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Entrada manual: raspar o Instagram automaticamente fere os termos de uso. Múltiplo de 3x ou mais = sinal; abaixo de 1,5x = dia normal da conta.</p>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Contas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <NewAccount />
          {GROUPS.map((g) => {
            const list = accounts.filter((a) => a.grp === g.value);
            if (!list.length) return null;
            return (
              <div key={g.value}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
                <div className="flex flex-wrap gap-2">{list.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                    {a.handle}<span className="text-xs text-muted-foreground">{fmtNum(a.followers)} seg. · mediana {fmtNum(a.median_views)}</span>
                    <button type="button" aria-label={`Apagar ${a.handle}`} className="text-muted-foreground hover:text-destructive" onClick={() => window.confirm(`Apagar ${a.handle} e os reels dela?`) && acc.remove.mutate(a.id)}><Trash2 className="size-3.5" /></button>
                  </span>
                ))}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Reels de referência</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {accounts.length ? <NewPost accounts={accounts} /> : <Empty>Cadastre uma conta primeiro.</Empty>}
          <div className="space-y-2">{sorted.map((p) => <PostRow key={p.id} p={p} acc={accounts.find((a) => a.id === p.account_id)} />)}</div>
        </CardContent>
      </Card>
    </div>
  );
}
