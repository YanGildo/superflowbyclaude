# Superflow

Sistema único para a operação: produtividade, CRM da agência, marketing, financeiro e vendas no Telegram.
Reconstrução do projeto Lovable (`superflowdash`) fora do Lovable.

**Stack:** React 18 + Vite + TypeScript (modo estrito) + Tailwind + shadcn/ui + TanStack Query + Supabase.

## Estado atual: Fase 0 (base)

Pronto e testado:
- Login, cadastro, esqueci a senha e redefinir senha (Supabase Auth)
- Menu unificado com todos os módulos (os que ainda não foram construídos mostram a fase em que entram)
- Seletor de **Negócio** no topo (Todos / Pessoal / RG Marketing / ...), lembrado entre visitas
- Dashboard com números reais do banco: tarefas, financeiro do mês, comercial e vendas do Telegram
- Configurações: cadastro de negócios (criar, renomear, cor, tipo, arquivar) e perfil
- Banco completo de todas as fases (56 tabelas, segurança por usuário, automações)

## Seu projeto (já criado)

- Supabase: projeto **`superflow`** (`jxzogffjeedimdvcliqp`, região São Paulo), na organização "bearhunter".
  É independente do projeto do BearHunter.
- Banco já aplicado: 56 tabelas, segurança ativa em todas, automações, views e jobs agendados.
- O `.env.local` deste pacote já aponta para ele (chave pública *publishable*, pode ficar no navegador).

**Falta só 1 ajuste no painel do Supabase antes de criar sua conta:**
Authentication → **URL Configuration** → Site URL = `http://localhost:8080` (e adicione o mesmo em Redirect URLs).
Se preferir entrar sem confirmar e-mail: Authentication → Providers → Email → desligue **Confirm email**.

Depois: `npm install` e `npm run dev`, abra http://localhost:8080 e clique em **Criar conta**.

## Como montar do zero (outro ambiente)

### 1. Criar o banco
1. Em [supabase.com](https://supabase.com), crie um projeto novo (região São Paulo).
2. Abra **SQL Editor** e rode, nesta ordem, o conteúdo de:
   - `supabase/migrations/20261029000000_schema_inicial.sql`
   - `supabase/migrations/20261029000100_jobs_pg_cron.sql` (antes, habilite a extensão **pg_cron** em Database → Extensions)
3. Em **Authentication → Providers → Email**, decida se quer exigir confirmação de e-mail.
   Para uso só seu, pode desligar "Confirm email" e entrar direto.
4. Em **Authentication → URL Configuration**, coloque a URL do site (ex.: `http://localhost:8080` no começo).

> Crie sua conta **depois** de rodar o SQL. É o cadastro que monta seu workspace, o negócio "Pessoal", o pipeline, as categorias financeiras e os serviços padrão.

### 2. Rodar no computador
Precisa do [Node.js 20+](https://nodejs.org).

```bash
npm install
cp .env.example .env.local    # e preencha com Project Settings → API
npm run dev                   # abre em http://localhost:8080
```

`.env.local`:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...   (chave "anon public", nunca a service_role)
```

### 3. Publicar (opcional)
Vercel ou Cloudflare Pages: importe o repositório, comando `npm run build`, pasta `dist`, e cadastre as duas variáveis acima.
Configure também o redirecionamento de SPA (todas as rotas → `index.html`).

## Dar acesso a outra pessoa
O banco já suporta (`workspace_members`, papéis owner/admin/member/viewer). A tela **Equipe** (convite) entra na Fase 1.
Até lá, dá para adicionar manualmente pelo SQL Editor, depois que a pessoa criar a conta dela:

```sql
-- a pessoa cria conta normalmente; isso cria um workspace próprio para ela.
-- para colocá-la no SEU workspace:
insert into public.workspace_members (workspace_id, user_id, role)
select w.id, u.id, 'member'
from public.workspaces w, auth.users u
where w.owner_id = (select id from auth.users where email = 'SEU-EMAIL')
  and u.email = 'EMAIL-DA-PESSOA';
```
> Use `'viewer'` se ela só puder ver.

## Estrutura

```
src/
  integrations/supabase/   cliente e tipos do banco
  lib/                     auth, workspace/negócio, menu (nav.ts), formatação
  hooks/                   consultas (ex.: useDashboardKpis)
  components/layout/       layout, menu lateral, seletor de negócio
  components/ui/           shadcn/ui (reaproveitado do projeto antigo)
  pages/                   telas
supabase/migrations/       SQL do banco
docs/                      documentação do projeto antigo, arquitetura e backup
```

## Roadmap

| Fase | Entrega |
|---|---|
| 0 | Base: login, layout, menu, negócios, dashboard ✅ |
| 1 | Produtividade: tarefas, hoje, projetos, metas, funis, equipe, lixeira |
| 2 | Financeiro: lançamentos, pagar/receber, dívidas, cartões, reservas |
| 3 | Comercial: contatos, pipeline, propostas, prospecção (Apify), scripts |
| 4 | Marketing: planejamento, produção, campanhas, entregas |
| 5 | Telegram (painel): robôs, leads, conversas, dashboard de vendas |
| 6 | Telegram (vendas): fluxos, ofertas, gateways, remarketing, VIP, links |
| 7 | Migração dos dados do Lovable |

Detalhes em `docs/02_ARQUITETURA_SUPERFLOW_V2.md`.
