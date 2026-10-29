import {
  Megaphone, Instagram, Users, Globe, FileText, ShoppingCart, PartyPopper,
  MessageCircle, Send, Mail, Phone, ClipboardList, BadgeDollarSign, TrendingUp, Repeat, StickyNote,
  type LucideIcon,
} from "lucide-react";
import type { Edge, Node } from "@xyflow/react";

export type BlockKind =
  | "anuncio" | "organico" | "indicacao"
  | "landing" | "vendas" | "checkout" | "obrigado"
  | "whatsapp" | "telegram" | "email" | "reuniao"
  | "lead" | "compra" | "upsell" | "remarketing"
  | "nota";

export interface BlockDef { kind: BlockKind; label: string; group: string; icon: LucideIcon; color: string }

export const BLOCKS: BlockDef[] = [
  { kind: "anuncio", label: "Anúncio pago", group: "Tráfego", icon: Megaphone, color: "#0D47A1" },
  { kind: "organico", label: "Conteúdo orgânico", group: "Tráfego", icon: Instagram, color: "#0D47A1" },
  { kind: "indicacao", label: "Indicação", group: "Tráfego", icon: Users, color: "#0D47A1" },
  { kind: "landing", label: "Landing page", group: "Páginas", icon: Globe, color: "#0891b2" },
  { kind: "vendas", label: "Página de vendas", group: "Páginas", icon: FileText, color: "#0891b2" },
  { kind: "checkout", label: "Checkout", group: "Páginas", icon: ShoppingCart, color: "#0891b2" },
  { kind: "obrigado", label: "Obrigado", group: "Páginas", icon: PartyPopper, color: "#0891b2" },
  { kind: "whatsapp", label: "WhatsApp", group: "Canais", icon: MessageCircle, color: "#059669" },
  { kind: "telegram", label: "Telegram", group: "Canais", icon: Send, color: "#059669" },
  { kind: "email", label: "E-mail", group: "Canais", icon: Mail, color: "#059669" },
  { kind: "reuniao", label: "Ligação / reunião", group: "Canais", icon: Phone, color: "#059669" },
  { kind: "lead", label: "Lead / formulário", group: "Conversões", icon: ClipboardList, color: "#d97706" },
  { kind: "compra", label: "Compra", group: "Conversões", icon: BadgeDollarSign, color: "#d97706" },
  { kind: "upsell", label: "Upsell", group: "Conversões", icon: TrendingUp, color: "#d97706" },
  { kind: "remarketing", label: "Remarketing", group: "Conversões", icon: Repeat, color: "#d97706" },
  { kind: "nota", label: "Nota", group: "Outros", icon: StickyNote, color: "#64748b" },
];

export const blockDef = (kind: string) => BLOCKS.find((b) => b.kind === kind) ?? BLOCKS[BLOCKS.length - 1];

export interface BlockData extends Record<string, unknown> {
  kind: BlockKind;
  label: string;
  note?: string;
  url?: string;
  visits?: number | null;
  conversions?: number | null;
}

export type BlockNode = Node<BlockData, "block">;

let seq = 0;
export const newNodeId = () => `n${Date.now().toString(36)}${(seq++).toString(36)}`;

export function makeNode(kind: BlockKind, x: number, y: number, label?: string): BlockNode {
  return { id: newNodeId(), type: "block", position: { x, y }, data: { kind, label: label ?? blockDef(kind).label } };
}

const edge = (a: BlockNode, b: BlockNode, label?: string): Edge => ({
  id: `e-${a.id}-${b.id}`, source: a.id, target: b.id, label, type: "smoothstep", animated: false,
});

/** Modelos prontos de funil. */
export const TEMPLATES: { id: string; name: string; description: string; build: () => { nodes: BlockNode[]; edges: Edge[] } }[] = [
  { id: "vazio", name: "Em branco", description: "Comece do zero.", build: () => ({ nodes: [], edges: [] }) },
  {
    id: "whatsapp", name: "Anúncio → WhatsApp", description: "Clássico de serviço local: anúncio leva para conversa e fechamento.",
    build: () => {
      const a = makeNode("anuncio", 0, 68, "Anúncio Meta Ads"), b = makeNode("whatsapp", 240, 68, "Conversa no WhatsApp"),
        c = makeNode("reuniao", 480, 0, "Orçamento / visita"), d = makeNode("compra", 720, 68, "Cliente fechado"),
        e = makeNode("remarketing", 480, 153, "Follow-up de quem sumiu");
      return { nodes: [a, b, c, d, e], edges: [edge(a, b), edge(b, c), edge(c, d), edge(b, e), edge(e, c)] };
    },
  },
  {
    id: "telegram", name: "Telegram VIP", description: "Tráfego → bot → PIX → acesso ao grupo VIP, com remarketing.",
    build: () => {
      const a = makeNode("organico", 0, 0, "Conteúdo / prévia"), b = makeNode("anuncio", 0, 136, "Anúncio"),
        c = makeNode("telegram", 240, 68, "Bot (/start)"), d = makeNode("checkout", 480, 68, "PIX gerado"),
        e = makeNode("compra", 720, 68, "PIX pago → acesso VIP"), f = makeNode("remarketing", 480, 204, "Remarketing de PIX não pago"),
        g = makeNode("upsell", 960, 68, "Upsell / renovação");
      return { nodes: [a, b, c, d, e, f, g], edges: [edge(a, c), edge(b, c), edge(c, d), edge(d, e), edge(d, f), edge(f, d), edge(e, g)] };
    },
  },
  {
    id: "site", name: "Site → Lead → Venda", description: "Para agência: tráfego para landing page, captura de lead e proposta.",
    build: () => {
      const a = makeNode("anuncio", 0, 68, "Google / Meta Ads"), b = makeNode("landing", 240, 68, "Landing page"),
        c = makeNode("lead", 480, 68, "Formulário"), d = makeNode("reuniao", 720, 68, "Reunião de diagnóstico"),
        e = makeNode("compra", 960, 68, "Proposta aceita"), f = makeNode("email", 720, 204, "Nutrição por e-mail");
      return { nodes: [a, b, c, d, e, f], edges: [edge(a, b), edge(b, c), edge(c, d), edge(d, e), edge(c, f), edge(f, d)] };
    },
  },
  {
    id: "infoproduto", name: "Infoproduto low ticket", description: "Anúncio → página de vendas → checkout → upsell.",
    build: () => {
      const a = makeNode("anuncio", 0, 68, "Anúncio"), b = makeNode("vendas", 240, 68, "Página de vendas"),
        c = makeNode("checkout", 480, 68, "Checkout"), d = makeNode("obrigado", 720, 0, "Obrigado + entrega"),
        e = makeNode("upsell", 720, 136, "Order bump / upsell"), f = makeNode("remarketing", 480, 204, "Carrinho abandonado");
      return { nodes: [a, b, c, d, e, f], edges: [edge(a, b), edge(b, c), edge(c, d), edge(c, e), edge(c, f), edge(f, c)] };
    },
  },
];
