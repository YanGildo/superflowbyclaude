// Tela de Integrações: guia visual do que está ligado, do que falta configurar e do que vem depois.
// ATUALIZE este arquivo sempre que uma integração mudar de estado ou surgir uma pendência nova.

export type IntegrationStatus = "ativo" | "configurar" | "opcional" | "em_breve" | "pausado";

export const STATUS_INFO: Record<IntegrationStatus, { label: string; tone: string }> = {
  ativo: { label: "Ativo", tone: "bg-success/10 text-success" },
  configurar: { label: "Falta configurar", tone: "bg-warning/15 text-warning" },
  opcional: { label: "Opcional", tone: "bg-muted text-muted-foreground" },
  em_breve: { label: "Em breve", tone: "bg-info/10 text-info" },
  pausado: { label: "Pausado", tone: "bg-muted text-muted-foreground" },
};

export interface Integration {
  id: string; name: string; status: IntegrationStatus; what: string;
  /** O que já funciona hoje sem ela. */
  today?: string;
  /** Onde aparece no Superflow. */
  where: { label: string; to: string }[];
  /** Passos para ligar (quando depende de você). */
  steps?: string[];
}

export const INTEGRATIONS: Integration[] = [
  {
    id: "supabase", name: "Supabase (banco e login)", status: "ativo",
    what: "Guarda todos os dados, o login e as rotinas automáticas (contas atrasadas, lixeira, varreduras da Central).",
    where: [{ label: "Todo o sistema", to: "/" }],
  },
  {
    id: "motor", name: "Motor de prospecção (Google Maps Scraper)", status: "configurar",
    what: "Busca empresas no Google Maps sem Apify e sem chave de API. Roda no seu PC com o Docker aberto.",
    where: [{ label: "Prospecção → Buscar leads", to: "/prospeccao?aba=buscar" }, { label: "Configurações do motor", to: "/prospeccao?aba=config" }],
    steps: ["Docker Desktop aberto", "Na pasta motor-prospeccao: copy .env.example .env, trocar a MOTOR_SENHA", "docker compose up -d", "Prospecção → Configurações → endereço http://localhost:8090 + senha → Testar → Salvar"],
  },
  {
    id: "enrich", name: "Enriquecimento de prospects", status: "ativo",
    what: "Visita o site de cada empresa: e-mails, redes sociais, pixels de anúncio, verificação de e-mail e nota de intenção. Roda no Supabase.",
    where: [{ label: "Prospecção → Lista → Enriquecer", to: "/prospeccao?aba=lista" }],
  },
  {
    id: "assistente", name: "Varreduras da Central do dia", status: "ativo",
    what: "Três vezes por dia o sistema prepara rascunhos de follow-up e de proposta parada e guarda o resumo do dia.",
    where: [{ label: "Hoje · Central do dia", to: "/hoje" }, { label: "Regras do assistente", to: "/configuracoes?aba=assistente" }],
  },
  {
    id: "osm", name: "OpenStreetMap", status: "ativo",
    what: "Mapa da prospecção e localização das cidades nas buscas. Grátis, sem chave.",
    where: [{ label: "Prospecção → Mapa", to: "/prospeccao?aba=mapa" }],
  },
  {
    id: "apify", name: "Apify", status: "opcional",
    what: "Alternativa paga ao motor próprio para buscar no Google Maps.",
    today: "O motor próprio faz o mesmo de graça.",
    where: [{ label: "Prospecção → Configurações", to: "/prospeccao?aba=config" }],
    steps: ["Supabase → Edge Functions → Secrets → APIFY_TOKEN", "Prospecção → Configurações → Buscar com: Apify"],
  },
  {
    id: "gcal", name: "Google Agenda", status: "em_breve",
    what: "Puxar e criar compromissos reais na Agenda da Central do dia.",
    today: "A Agenda da Central já funciona com compromissos cadastrados no Superflow.",
    where: [{ label: "Hoje · Agenda", to: "/hoje#agenda" }],
  },
  {
    id: "gmail", name: "Gmail", status: "em_breve",
    what: "Ler e-mails que precisam de você e deixar o rascunho de resposta pronto no Gmail (nunca envia sozinho).",
    today: "Rascunhos de WhatsApp para follow-up e proposta parada.",
    where: [{ label: "Hoje · Precisa de mim / Rascunhos", to: "/hoje" }],
  },
  {
    id: "whatsapp", name: "WhatsApp (API oficial)", status: "em_breve",
    what: "Enviar e receber mensagens de verdade dentro do Superflow, depois da sua aprovação.",
    today: "WhatsApp simulado no CRM e rascunhos que abrem o seu WhatsApp com o texto pronto.",
    where: [{ label: "WhatsApp", to: "/whatsapp" }, { label: "Rascunhos da Central", to: "/hoje" }],
  },
  {
    id: "ads", name: "Meta Ads · Google Ads · Google Analytics", status: "em_breve",
    what: "Puxar investimento, cliques, leads e vendas das campanhas automaticamente.",
    today: "Os números são preenchidos à mão em cada campanha (ou pela demonstração).",
    where: [{ label: "Dashboard de Campanhas", to: "/marketing/campanhas-dashboard" }],
  },
  {
    id: "openfinance", name: "Open Finance (bancos e investimentos)", status: "em_breve",
    what: "Puxar saldos das contas e valores dos investimentos sozinho, sem digitar.",
    today: "Saldos vêm dos lançamentos; bens e investimentos têm o valor atualizado à mão em Carteira → Patrimônio.",
    where: [{ label: "Fluxo de caixa", to: "/financeiro/fluxo-de-caixa" }, { label: "Patrimônio", to: "/financeiro/carteira?aba=patrimonio" }],
  },
  {
    id: "notify", name: "Avisos fora do Superflow (e-mail / celular)", status: "em_breve",
    what: "Receber o resumo do dia e os alertas mesmo com o Superflow fechado.",
    today: "O mascote no topo do menu avisa quando tem coisa esperando.",
    where: [{ label: "Hoje · Central do dia", to: "/hoje" }],
  },
  {
    id: "ia", name: "IA via conector (MCP)", status: "em_breve",
    what: "Usar o Claude com o seu login para escrever rascunhos, resumir o dia e operar o sistema, com permissão por aba.",
    today: "Resumo do dia e rascunhos montados por regras e modelos, sem IA.",
    where: [{ label: "Central do dia", to: "/hoje" }],
  },
  {
    id: "telegram", name: "Telegram + gateways PIX", status: "pausado",
    what: "Robôs de venda, fluxos, ofertas, gateways PIX, remarketing e grupos VIP.",
    today: "Módulo escondido do menu até a segunda etapa (o banco já está pronto).",
    where: [],
  },
];

export interface PendingItem {
  id: string; title: string; why: string; steps: string[]; optional?: boolean;
  /** Feito automaticamente pelo sistema (não precisa marcar). */
  auto?: "motor";
}

/** O que depende de você para o Superflow ficar 100% online. */
export const PENDING: PendingItem[] = [
  {
    id: "vercel", title: "Publicar o Superflow na Vercel", why: "Para abrir o sistema de qualquer lugar, com um endereço próprio.",
    steps: ["vercel.com → entrar com o GitHub → importar superflowbyclaude", "Environment Variables: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (as mesmas do .env.local)", "Deploy"],
  },
  {
    id: "auth-url", title: "Avisar o Supabase do endereço novo", why: "Sem isso, e-mails de redefinir senha e convites apontam para o lugar errado.",
    steps: ["Supabase → Authentication → URL Configuration", "Site URL = endereço da Vercel", "Redirect URLs = endereço da Vercel + /**"],
  },
  {
    id: "signup", title: "Fechar o cadastro aberto", why: "Hoje qualquer pessoa com o link cria uma conta (não vê seus dados, mas usa o sistema).",
    steps: ["Depois de criar sua conta online: Supabase → Authentication → Sign In / Providers", "Desligar \"Allow new users to sign up\"", "Para convidar alguém: Authentication → Users → Invite"],
  },
  {
    id: "motor", title: "Ligar o motor de prospecção", why: "Para buscar leads no Google Maps de graça.", auto: "motor",
    steps: ["Docker Desktop aberto", "Pasta motor-prospeccao: .env com MOTOR_SENHA + docker compose up -d", "Prospecção → Configurações → senha → Testar → Salvar"],
  },
  {
    id: "apify-token", title: "Token da Apify", why: "Só se for usar a Apify em vez do motor próprio.", optional: true,
    steps: ["Supabase → Edge Functions → Secrets", "Nome APIFY_TOKEN, valor = seu token da Apify"],
  },
  {
    id: "leaked-pw", title: "Proteção contra senhas vazadas", why: "Recomendação de segurança do Supabase (pode exigir plano pago).", optional: true,
    steps: ["Supabase → Authentication → Attack Protection", "Ligar \"Leaked password protection\""],
  },
  {
    id: "dominio", title: "Domínio próprio", why: "Ex.: app.rgmarketing.com.br no lugar do endereço da Vercel.", optional: true,
    steps: ["Vercel → projeto → Settings → Domains → adicionar", "No registro do domínio, criar o CNAME que a Vercel mostrar", "Repetir o passo \"Avisar o Supabase do endereço novo\" com o domínio"],
  },
];

/** Funções já planejadas que ficaram para depois (por decisão sua). */
export const PLANNED: { id: string; title: string; what: string; where: string }[] = [
  {
    id: "relacionamento", title: "Relacionamento com clientes",
    what: "Frequência ideal de contato por cliente, lista \"Falar agora\" com quem está atrasado, botão \"Falei hoje\" e último contato calculado sozinho. Entra também na Central do dia.",
    where: "Comercial (aba Relacionamento) + Central do dia",
  },
];
