import {
  LayoutDashboard, Sun, ListTodo, FolderKanban, Target, Workflow,
  KanbanSquare, Users, Search, MessageSquareText, MessagesSquare, Gauge,
  Megaphone, PackageCheck, Plug,
  Wallet, ArrowLeftRight, Receipt, CreditCard, PiggyBank,
  BarChart3, Bot, GitBranch, Tag, Landmark, Repeat, Crown, Link2,
  Settings, Trash2, UsersRound, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Fase do roadmap em que a tela fica pronta (0 = já existe). */
  phase: number;
  description: string;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    id: "geral",
    label: "Geral",
    items: [
      { path: "/", label: "Dashboard", icon: LayoutDashboard, phase: 0, description: "Visão geral de todos os negócios." },
      { path: "/hoje", label: "Hoje", icon: Sun, phase: 0, description: "Tarefas do dia, agenda e pendências." },
      { path: "/tarefas", label: "Tarefas", icon: ListTodo, phase: 0, description: "Listas, kanban e fluxos de produção num sistema só." },
      { path: "/projetos", label: "Projetos", icon: FolderKanban, phase: 0, description: "Iniciativas, entregas e próximas ações." },
      { path: "/metas", label: "Metas", icon: Target, phase: 0, description: "Objetivos com etapas que viram tarefas." },
      { path: "/funis", label: "Funis", icon: Workflow, phase: 0, description: "Canvas visual de funis e jornadas." },
    ],
  },
  {
    id: "crm",
    label: "CRM Agência",
    items: [
      { path: "/agencia", label: "Dashboard da Agência", icon: Gauge, phase: 0, description: "Clientes, propostas, receita e demandas da agência." },
      { path: "/comercial", label: "Comercial", icon: KanbanSquare, phase: 0, description: "Pipeline, clientes, propostas, jornada, conversões e contatos." },
      { path: "/prospeccao", label: "Prospecção", icon: Search, phase: 0, description: "Busca de empresas no Google Maps (Apify), mapa e lista de prospects." },
      { path: "/scripts", label: "Scripts", icon: MessageSquareText, phase: 0, description: "Mensagens prontas por segmento, com variáveis." },
      { path: "/whatsapp", label: "WhatsApp", icon: MessagesSquare, phase: 0, description: "WhatsApp simulado ligado ao CRM (o real entra nas integrações)." },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    items: [
      { path: "/marketing", label: "Marketing", icon: Megaphone, phase: 4, description: "Plano do mês, campanhas, conteúdos, vídeos, calendário e ideias." },
      { path: "/marketing/campanhas-dashboard", label: "Dashboard de Campanhas", icon: BarChart3, phase: 4, description: "Investimento e resultado das campanhas (Meta/Google)." },
      { path: "/marketing/entregas", label: "Entregas", icon: PackageCheck, phase: 4, description: "Entregas para clientes com prazos e aprovação." },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    items: [
      { path: "/financeiro", label: "Visão geral", icon: Wallet, phase: 0, description: "Entradas, saídas e saldo por negócio." },
      { path: "/financeiro/lancamentos", label: "Lançamentos", icon: ArrowLeftRight, phase: 0, description: "Todas as entradas e saídas." },
      { path: "/financeiro/contas", label: "Pagar e receber", icon: Receipt, phase: 0, description: "Contas a pagar, a receber e recorrências." },
      { path: "/financeiro/carteira", label: "Dívidas e cartões", icon: CreditCard, phase: 0, description: "Dívidas parceladas, cartões e contas bancárias." },
      { path: "/financeiro/reservas", label: "Reservas e metas", icon: PiggyBank, phase: 0, description: "Reservas e metas financeiras." },
    ],
  },
  {
    id: "telegram",
    label: "Vendas Telegram",
    items: [
      { path: "/telegram", label: "Dashboard de vendas", icon: BarChart3, phase: 5, description: "Starts, PIX gerados e pagos, conversão, ticket médio." },
      { path: "/telegram/leads", label: "Leads e conversas", icon: Users, phase: 5, description: "Quem iniciou o bot, o que fez e a conversa completa." },
      { path: "/telegram/robos", label: "Robôs", icon: Bot, phase: 5, description: "Cadastro dos bots (token do BotFather)." },
      { path: "/telegram/fluxos", label: "Fluxos de venda", icon: GitBranch, phase: 6, description: "Editor visual de fluxos do bot." },
      { path: "/telegram/ofertas", label: "Ofertas", icon: Tag, phase: 6, description: "Produtos e planos vendidos no bot." },
      { path: "/telegram/gateways", label: "Gateways", icon: Landmark, phase: 6, description: "Conexão com as APIs de PIX." },
      { path: "/telegram/remarketing", label: "Remarketing", icon: Repeat, phase: 6, description: "Disparos para quem não pagou." },
      { path: "/telegram/vip", label: "Grupos VIP", icon: Crown, phase: 6, description: "Acesso com prazo e remoção automática." },
      { path: "/telegram/links", label: "Links de rastreio", icon: Link2, phase: 6, description: "Links com origem (?start=) por campanha." },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [
      { path: "/integracoes", label: "Integrações", icon: Plug, phase: 7, description: "Google, Microsoft, WhatsApp API, Telegram e outras conexões." },
      { path: "/configuracoes", label: "Configurações", icon: Settings, phase: 0, description: "Perfil, negócios, aparência e preferências." },
      { path: "/equipe", label: "Equipe", icon: UsersRound, phase: 0, description: "Convidar outra pessoa e definir o acesso." },
      { path: "/lixeira", label: "Lixeira", icon: Trash2, phase: 0, description: "Itens excluídos nos últimos 30 dias." },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV.flatMap((s) => s.items);

export const PHASE_LABEL: Record<number, string> = {
  0: "Base",
  1: "Fase 1 · Produtividade",
  2: "Fase 2 · Financeiro",
  3: "Fase 3 · Comercial",
  4: "Fase 4 · Marketing",
  5: "Fase 5 · Telegram (painel)",
  6: "Fase 6 · Telegram (vendas)",
  7: "Integrações",
};
