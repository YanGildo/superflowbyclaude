import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Exibida quando o .env.local ainda não aponta para um projeto Supabase. */
export default function Setup() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Falta conectar o banco</CardTitle>
          <CardDescription>O Superflow ainda não sabe qual projeto Supabase usar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Crie um projeto em <span className="font-medium">supabase.com</span>.</li>
            <li>No SQL Editor, rode os arquivos de <code className="rounded bg-muted px-1">supabase/migrations</code> em ordem.</li>
            <li>
              Copie <code className="rounded bg-muted px-1">.env.example</code> para <code className="rounded bg-muted px-1">.env.local</code> e preencha
              a URL e a chave <em>anon</em> (Project Settings → API).
            </li>
            <li>Reinicie o <code className="rounded bg-muted px-1">npm run dev</code>.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
