# SUPERFLOW V2: ARQUITETURA DA RECONSTRUÇÃO

> Proposta para revisar. O que precisa de decisão sua está marcado com **[DECIDIR]**.
> Base: documentação do projeto atual (arquivo 01) e o contexto de vendas no Telegram (estilo SharkBot).

---

## 1. Objetivo

Uma ferramenta única para a operação inteira, sem a separação "espaço pessoal x espaço agência":

- **Produtividade:** tarefas, projetos, metas, funis visuais
- **Comercial (CRM da agência):** prospecção, pipeline, propostas, scripts
- **Marketing:** plano, conteúdo, vídeos, campanhas, entregas
- **Financeiro:** pessoal e empresas no mesmo lugar, separado por filtro
- **Vendas no Telegram (fase 2):** robôs, fluxos de venda, gateways PIX, dashboard de vendas

Tudo salvo no banco (nada no navegador), acessível de qualquer dispositivo.

---

## 2. Decisão central: acabar com os "espaços"

Hoje cada espaço tem menu, dados e regras próprias. Isso gerou dados duplicados e muitos bugs.

**Proposta:** um único ambiente, com uma etiqueta **"Negócio"** em cada registro.

| Hoje | V2 |
|---|---|
| Espaço "Meu FlowBoard" (pessoal) | Negócio = **Pessoal** |
| Espaço "RG Marketing" (agência) | Negócio = **RG Marketing** |
| Projetos chumbados no código (RG Studio, Alavanca, Sport Pump...) | Cadastro de **Negócios** editável |

- Um seletor no topo filtra tudo: **Todos / Pessoal / RG Marketing / RG Studio / ...**
- O dashboard em "Todos" mostra a visão consolidada (o que você quer de verdade).
- Por baixo existe um `workspace_id` invisível. Ele permite, no futuro, convidar equipe sem refazer o banco.

---

## 3. Menu lateral unificado

```
INÍCIO
  Dashboard            visão geral com cards configuráveis
  Hoje                 tarefas do dia + agenda + pendências

PRODUTIVIDADE
  Tarefas              um sistema só: listas (To Do), kanban e fluxos como "visões"
  Projetos
  Metas
  Funis                canvas visual (React Flow), mantido como está

COMERCIAL
  Pipeline             kanban de oportunidades
  Contatos             leads e clientes num cadastro só
  Propostas
  Prospecção           Google Maps via Apify (já funciona, só migrar)
  Scripts

MARKETING
  Planejamento         plano + calendário
  Produção             conteúdos e vídeos num pipeline só
  Campanhas
  Entregas

FINANCEIRO
  Visão geral
  Lançamentos          entradas e saídas
  Contas a pagar / receber
  Dívidas, cartões e contas bancárias
  Reservas e metas financeiras

VENDAS TELEGRAM        (fase 2)
  Dashboard de vendas
  Leads e conversas
  Robôs
  Fluxos de venda
  Ofertas / produtos
  Gateways
  Remarketing
  Grupos VIP

SISTEMA
  Configurações · Lixeira · Equipe
```

**O que sai:** templates Clínica, Escola, Advocacia, Loja, Prestador; WhatsApp simulado; página de Integrações "em breve"; Agente de chat (prévia). **[DECIDIR]** O módulo Imobiliário sai também?

---

## 4. Unificações (onde hoje existe duplicidade)

| Hoje (vários) | V2 (um só) |
|---|---|
| Tarefas gerais (local) + Tasks To Do (nuvem) + tarefas de funil | `tasks` com listas, fluxo, projeto, checklist, recorrência |
| Client (geral) + AgencyClient + leads do WhatsApp sim. | `contacts` (pessoa/empresa) + `deals` (oportunidade no pipeline) |
| Prospect (nuvem) | `prospects` (mantido) → botão "Converter" cria contato + oportunidade |
| Propostas agência + propostas imobiliárias | `proposals` com itens de serviço |
| Financeiro simples + Planilha + tabelas na nuvem | `transactions` (entradas/saídas) + `payables` / `receivables` / `debts` / `cards` / `accounts` / `reserves` |
| Conteúdo agência + Conteúdo geral + Marketing + Vídeos | `content_items` com tipo e etapa |
| Campanhas agência + campanhas imobiliárias | `campaigns` |
| Vendas ("Meus SaaS e Vendas") | `sales` ligada a `offers` e gerando `transactions` |

### Automações que passam a existir de verdade

1. **Proposta aprovada** → contato vira cliente ativo, gera conta a receber recorrente (mensalidade) e entregas iniciais do template.
2. **Venda paga** (manual ou Telegram) → gera lançamento de entrada no financeiro automaticamente.
3. **Conta a receber marcada como recebida** → gera lançamento de entrada.
4. **Lembretes e recorrências** de tarefas e contas → disparados por job agendado (no projeto atual nada dispara).
5. **Lixeira** com expurgo de 30 dias feito no servidor.

---

## 5. Stack recomendada

| Camada | Escolha | Por quê |
|---|---|---|
| Frontend | **React + Vite + TypeScript + Tailwind + shadcn/ui** | Mesma base do Lovable: dá para reaproveitar telas e componentes |
| Dados no front | **TanStack Query** | Substitui os ~50 stores do Zustand que salvavam no navegador |
| Banco + login + arquivos | **Supabase** (Postgres, Auth, Storage, RLS) | Já usado, barato no começo, aguenta o módulo Telegram |
| Lógica de servidor | **Supabase Edge Functions** | Webhooks do Telegram e dos gateways, Apify, automações |
| Jobs agendados | **pg_cron** (Supabase) | Lembretes, recorrências, remarketing, expiração de VIP |
| Hospedagem do front | Vercel ou Cloudflare Pages (grátis) | — |
| Worker opcional | Node na DigitalOcean (US$ 4) | Só se o remarketing em massa estourar limite das Edge Functions |

**[DECIDIR]** Criar um **projeto Supabase novo** (recomendado: começa limpo) ou reaproveitar o do Lovable Cloud?

---

## 6. Módulo Vendas Telegram (fase 2)

### 6.1 Como funciona

```
Lead clica no link  t.me/SeuBot?start=origem
        │
        ▼
Telegram ──webhook──▶ Edge Function "telegram-webhook"
                         │  grava evento "start"
                         │  executa o fluxo do robô (mensagens, botões, mídia)
                         ▼
                   Lead escolhe oferta ──▶ gera PIX no gateway
                         │                 grava evento "pix_gerado"
                         ▼
Gateway ──webhook "pago"──▶ Edge Function "gateway-webhook"
                         │  grava evento "pix_pago" + venda + lançamento financeiro
                         ▼
                   Bot entrega: link de convite único / arquivo / mensagem
                   grava evento "entregue"
                         │
                         ▼
             pg_cron: remarketing de quem gerou PIX e não pagou;
                      remove do grupo VIP quando o plano vence
```

### 6.2 Métricas (tudo vem da tabela de eventos)

| Métrica | Cálculo |
|---|---|
| Total de starts | nº de eventos `start` no período |
| PIX gerados / pagos | nº de `pix_gerado` / `pix_pago` |
| Taxa de conversão | PIX pagos ÷ PIX gerados |
| Conversão de start | vendas ÷ starts |
| Starts por venda | starts ÷ vendas |
| Vendas aprovadas (R$) | soma dos pagamentos aprovados |
| Ticket médio | faturamento ÷ vendas pagas |
| Desempenho 7 dias | faturamento agrupado por dia |
| Log em tempo real | últimos eventos (Supabase Realtime) |
| Meta de faturamento | soma do mês ÷ meta cadastrada |

Filtros: Hoje / Ontem / 7 dias / 30 dias / Total, por robô, por oferta e por origem (`?start=`).

### 6.3 Editor de fluxos

Mesmo motor visual dos Funis (React Flow), mas com blocos executáveis:

| Bloco | O que faz |
|---|---|
| Início | gatilho `/start` (com ou sem parâmetro de origem) |
| Mensagem | texto, foto, vídeo, áudio, documento, com botões |
| Botões / menu | cada botão leva a outro bloco |
| Espera | aguarda X minutos ou horas |
| Pergunta | captura resposta e salva em variável |
| Condição | se pagou / se clicou / se a variável vale X |
| Oferta / PIX | gera cobrança no gateway escolhido |
| Entrega | link de convite único, arquivo ou mensagem |
| Upsell / Downsell | nova oferta depois da compra ou da recusa |
| Etiqueta | marca o lead (para remarketing e filtros) |

Cada lead guarda **em que bloco do fluxo está** (`bot_sessions`), então o fluxo continua de onde parou.

### 6.4 Gateways (até 6)

- Um **adaptador padrão** com 3 operações: `criarCobrancaPix`, `consultarStatus` e `validarWebhook`. Cada gateway é um arquivo que implementa essas 3 operações.
- As chaves de API ficam **criptografadas no servidor**, nunca no navegador.
- **Fallback:** se o gateway principal falhar, a cobrança tenta o próximo da lista.
- Integrar não custa nada. Você paga só a taxa do gateway e some o R$ 0,50 por venda da plataforma.
- **[DECIDIR]** Quais gateways você usa hoje (ou quer usar)? Sugestão para começar: 2 gateways.

### 6.5 Segurança e confiabilidade

- Webhook do Telegram validado pelo header `X-Telegram-Bot-Api-Secret-Token`.
- Webhook do gateway validado por assinatura ou consulta de status no próprio gateway (nunca confiar só no corpo recebido).
- **Idempotência:** o mesmo pagamento nunca vira duas vendas (chave única por `gateway + id_externo`).
- Token de cada bot criptografado.
- Fora do escopo: "cloaking" de redirecionadores. Redirecionador com rastreamento de origem (UTM e `?start=`) entra normalmente.

---

## 7. Fases e entregas

| Fase | Entrega | Pronto quando |
|---|---|---|
| **0. Base** | Projeto novo, login, layout, menu, seletor de Negócio, banco com RLS | Você entra e navega com dados reais salvos |
| **1. Produtividade** | Tarefas unificadas, Hoje, Projetos, Metas, Funis | Substitui o uso diário do pessoal |
| **2. Financeiro** | Lançamentos, contas a pagar/receber, dívidas, cartões, reservas, dashboard | Substitui a Planilha Financeira |
| **3. Comercial** | Contatos, Pipeline, Propostas (com automações), Prospecção migrada, Scripts | Substitui o CRM da agência |
| **4. Marketing** | Planejamento, Produção, Campanhas, Entregas | Substitui Marketing/Conteúdo/Vídeos |
| **5. Telegram — painel** | Eventos, dashboard de vendas, leads, log ao vivo, 1 robô simples | Métricas iguais às do SharkBot |
| **6. Telegram — vendas** | Editor de fluxos, gateways, entrega, remarketing, grupos VIP | Você desliga o SharkBot |
| **7. Migração** | Importar dados do Lovable (localStorage + Supabase antigo) | Nada perdido |

As fases 1–4 podem andar em paralelo depois da fase 0. **[DECIDIR]** Quer antecipar o Telegram (fases 5–6) para logo depois do Financeiro, já que ele corta custo direto?

---

## 8. Migração dos dados atuais

Os dados que estão **no navegador** só existem no computador onde você usa o Lovable. Antes de desligar o projeto antigo, exporte com o script do arquivo `04_EXPORTAR_DADOS_NAVEGADOR.md` (cola no console do navegador, baixa um JSON). Depois um importador lê esse JSON e grava no banco novo.

Os dados que estão **no Supabase do Lovable** (tasks, financeiro da nuvem, prospecção) são copiados direto com SQL.

---

## 9. Decisões (29/10/2026)

| # | Pergunta | Decisão |
|---|---|---|
| 1 | Imobiliário | **Sai** na primeira versão. Volta numa fase futura, se quiser. |
| 2 | Supabase | **Projeto novo**, tudo fora do Lovable. |
| 3 | Gateways | Usa **Nexus Wallet**; já usou "Tichu Pay" (nome a confirmar) e o **Shark Global** (gateway nativo do SharkBot, para dólar). Falta confirmar se cada um tem API própria. |
| 4 | Ordem Telegram x Comercial | **Pendente.** Padrão adotado: fases na ordem da seção 7. |
| 5 | Equipe | Só o Yan por enquanto. Depois: criar login para mais 1 pessoa (já suportado por `workspace_members`). |
| 6 | Nome | **Superflow** (por enquanto). |
