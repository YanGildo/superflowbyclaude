import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth";

type Mode = "entrar" | "criar" | "esqueci";

export default function Login() {
  const { user, signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim()) return setError("Informe seu e-mail.");
    if (mode !== "esqueci" && password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (mode === "criar" && !fullName.trim()) return setError("Informe seu nome.");

    setBusy(true);
    const err =
      mode === "entrar" ? await signIn(email.trim(), password)
      : mode === "criar" ? await signUp(email.trim(), password, fullName.trim())
      : await resetPassword(email.trim());
    setBusy(false);

    if (err) return setError(err);
    if (mode === "criar") setInfo("Conta criada. Se a confirmação de e-mail estiver ligada, confirme pelo link que chegou e depois entre.");
    if (mode === "esqueci") setInfo("Se houver conta com esse e-mail, enviamos um link para redefinir a senha.");
  };

  const submitLabel = mode === "entrar" ? "Entrar" : mode === "criar" ? "Criar conta" : "Enviar link";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </div>
          <CardTitle>Superflow</CardTitle>
          <CardDescription>
            {mode === "esqueci" ? "Vamos enviar um link para criar uma senha nova." : "Sua operação inteira em um lugar."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode !== "esqueci" && (
            <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setError(null); setInfo(null); }} className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="entrar">Entrar</TabsTrigger>
                <TabsTrigger value="criar">Criar conta</TabsTrigger>
              </TabsList>
              <TabsContent value="entrar" />
              <TabsContent value="criar" />
            </Tabs>
          )}

          <form onSubmit={submit} className="space-y-3" noValidate>
            {mode === "criar" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {mode !== "esqueci" && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password" type="password"
                  autoComplete={mode === "criar" ? "new-password" : "current-password"}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {info && <Alert><AlertDescription>{info}</AlertDescription></Alert>}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {submitLabel}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {mode === "esqueci" ? (
              <button className="text-primary hover:underline" onClick={() => { setMode("entrar"); setError(null); setInfo(null); }}>
                Voltar para o login
              </button>
            ) : mode === "entrar" ? (
              <button className="text-muted-foreground hover:text-foreground hover:underline" onClick={() => { setMode("esqueci"); setError(null); setInfo(null); }}>
                Esqueci minha senha
              </button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
