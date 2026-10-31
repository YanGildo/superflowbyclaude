import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import { BrandMark, BrandWordmark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth";

type Mode = "entrar" | "criar" | "esqueci";

const MODE_TEXT: Record<Mode, { title: string; description: string; submit: string; done: string | null }> = {
  entrar: { title: "Bem-vindo de volta", description: "Acesse o Superflow.", submit: "Entrar", done: null },
  criar: {
    title: "Criar sua conta", description: "Acesse o Superflow.", submit: "Criar conta",
    done: "Conta criada. Se a confirmação de e-mail estiver ligada, confirme pelo link que chegou e depois entre.",
  },
  esqueci: {
    title: "Recuperar senha", description: "Vamos enviar um link para criar uma senha nova.", submit: "Enviar link",
    done: "Se houver conta com esse e-mail, enviamos um link para redefinir a senha.",
  },
};

/** Mensagem de erro do formulário, ou null se pode enviar. */
function validate(mode: Mode, email: string, password: string, fullName: string): string | null {
  if (!email.trim()) return "Informe seu e-mail.";
  if (mode !== "esqueci" && password.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (mode === "criar" && !fullName.trim()) return "Informe seu nome.";
  return null;
}

function BrandAside() {
  return (
    <aside className="brand-hero relative hidden flex-col justify-between p-10 lg:flex">
      <BrandWordmark light />
      <div className="max-w-md space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-cyan">Sua central de operação</p>
        <h1 className="font-heading text-4xl font-semibold leading-tight text-white">
          Tarefas, clientes, marketing e financeiro.
          <span className="block text-white/70">Tudo em um lugar só.</span>
        </h1>
        <ul className="space-y-3 text-sm text-white/80">
          {["Produtividade do dia a dia", "CRM e propostas da agência", "Financeiro pessoal e das empresas", "Marketing e campanhas"].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <CheckCircle2 className="size-4 text-brand-cyan" /> {t}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-white/40">Estratégia · Organização · Resultados</p>
    </aside>
  );
}

function ModeLink({ mode, go }: { mode: Mode; go: (m: Mode) => void }) {
  if (mode === "esqueci") {
    return <button className="text-primary hover:underline" onClick={() => go("entrar")}>Voltar para o login</button>;
  }
  if (mode === "entrar") {
    return (
      <button className="text-muted-foreground hover:text-foreground hover:underline" onClick={() => go("esqueci")}>
        Esqueci minha senha
      </button>
    );
  }
  return null;
}

interface Fields { email: string; password: string; fullName: string }

function LoginFields({ mode, v, set }: { mode: Mode; v: Fields; set: (k: keyof Fields, value: string) => void }) {
  return (
    <>
      {mode === "criar" && (
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" autoComplete="name" value={v.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" autoComplete="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
      </div>
      {mode !== "esqueci" && (
        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password" type="password"
            autoComplete={mode === "criar" ? "new-password" : "current-password"}
            value={v.password} onChange={(e) => set("password", e.target.value)}
          />
        </div>
      )}
    </>
  );
}

export default function Login() {
  const { user, signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>("entrar");
  const [v, setV] = useState<Fields>({ email: "", password: "", fullName: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  const text = MODE_TEXT[mode];
  const set = (k: keyof Fields, value: string) => setV((p) => ({ ...p, [k]: value }));
  const go = (m: Mode) => { setMode(m); setError(null); setInfo(null); };

  const run: Record<Mode, () => Promise<string | null>> = {
    entrar: () => signIn(v.email.trim(), v.password),
    criar: () => signUp(v.email.trim(), v.password, v.fullName.trim()),
    esqueci: () => resetPassword(v.email.trim()),
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const problem = validate(mode, v.email, v.password, v.fullName);
    if (problem) return setError(problem);

    setBusy(true);
    const err = await run[mode]();
    setBusy(false);

    if (err) return setError(err);
    if (text.done) setInfo(text.done);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Lado da marca */}
      <BrandAside />

      {/* Formulário */}
      <div className="flex items-center justify-center bg-background p-4 sm:p-8">
      <Card className="w-full max-w-sm border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="items-center text-center">
          <BrandMark className="mb-2 size-11 lg:hidden" />
          <CardTitle className="font-heading text-2xl">{text.title}</CardTitle>
          <CardDescription>{text.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {mode !== "esqueci" && (
            <Tabs value={mode} onValueChange={(m) => go(m as Mode)} className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="entrar">Entrar</TabsTrigger>
                <TabsTrigger value="criar">Criar conta</TabsTrigger>
              </TabsList>
              <TabsContent value="entrar" />
              <TabsContent value="criar" />
            </Tabs>
          )}

          <form onSubmit={submit} className="space-y-3" noValidate>
            <LoginFields mode={mode} v={v} set={set} />

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {info && <Alert><AlertDescription>{info}</AlertDescription></Alert>}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {text.submit}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <ModeLink mode={mode} go={go} />
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
