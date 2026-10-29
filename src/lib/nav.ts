import {
  LayoutDashboard, Sun, ListTodo, FolderKanban, Target, Workflow,
  KanbanSquare, Users, FileText, Search, MessageSquareText,
  CalendarRange, Clapperboard, Megaphone, PackageCheck,
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
    id: "inicio",
    label: "Início",
    items: [
      { path: "/", label: "Dashboard", icon: LayoutDashboard, phase: 0, description: "Visão geral de todos os negócios." },
      { path: "/hoje", label: "Hoje", icon: Sun, phase: 1, description: "Tarefas do dia, agenda e pendências." },
    ],
  },
  {
    id: "produtividade",
    label: "Produtividade",
    items: [
      { path: "/tarefas", label: "Tarefas", icon: ListTodo, phase: 1, description: "Listas, kanban e fluxos de produção num sistema só." },
      { path: "/projetos", label: "Projetos", icon: FolderKanban, phase: 1, description: "Iniciativas, entregas e próximas ações." },
      { path: "/metas", label: "Metas", icon: Target, phase: 1, description: "Objetivos com etapas que viram tarefas." },
      { path: "/funis", label: "Funis", icon: Workflow, phase: 1, description: "Canvas visual de funis e jornadas." },
    ],
  },
  {
    id: "comercial",
    label: "Comercial",
    items: [
      { path: "/comercial/pipeline", label: "Pipeline", icon: KanbanSquare, phase: 3, description: "Kanban de oportunidades, do lead ao cliente ativo." },
      { path: "/comercial/contatos", label: "Contatos", icon: Users, phase: 3, description: "Leads e clientes num cadastro único." },
      { path: "/comercial/propostas", label: "Propostas", icon: FileText, phase: 3, description: "Proposta aprovada vira cliente ativo e mensalidade a receber." },
      { path: "/comercial/prospeccao", label: "Prospecção", icon: Search, phase: 3, description: "Busca de empresas no Google Maps (Apify)." },
      { path: "/comercial/scripts", label: "Scripts", icon: MessageSquareText, phase: 3, description: "Mensagens prontas com variáveis." },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    items: [
      { path: "/marketing/planejamento", label: "Planejamento", icon: CalendarRange, phase: 4, description: "Plano de marketing e calendário." },
      { path: "/marketing/producao", label: "Produção", icon: Clapperboard, phase: 4, description: "Conteúdos e vídeos: ideia → roteiro → gravação → edição → publicado." },
      { path: "/marketing/campanhas", label: "Campanhas", icon: Megaphone, phase: 4, description: "Campanhas pagas e orgânicas por cliente." },
      { path: "/marketing/entregas", label: "Entregas", icon: PackageCheck, phase: 4, description: "Entregas para clientes com prazos e aprovação." },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    items: [
      { path: "/financeiro", label: "Visão geral", icon: Wallet, phase: 2, description: "Entradas, saídas e saldo por negócio." },
      { path: "/financeiro/lancamentos", label: "Lançamentos", icon: ArrowLeftRight, phase: 2, description: "Todas as entradas e saídas." },
      { path: "/financeiro/contas", label: "Pagar e receber", icon: Receipt, phase: 2, description: "Contas a pagar, a receber e recorrências." },
      { path: "/financeiro/carteira", label: "Dívidas e cartões", icon: CreditCard, phase: 2, description: "Dívidas parceladas, cartões e contas bancárias." },
      { path: "/financeiro/reservas", label: "Reservas e metas", icon: PiggyBank, phase: 2, description: "Reservas e metas financeiras." },
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
      { path: "/configuracoes", label: "Configurações", icon: Settings, phase: 0, description: "Perfil, negócios e preferências." },
      { path: "/equipe", label: "Equipe", icon: UsersRound, phase: 1, description: "Convidar outra pessoa e definir o acesso." },
      { path: "/lixeira", label: "Lixeira", icon: Trash2, phase: 1, description: "Itens excluídos nos últimos 30 dias." },
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
};
