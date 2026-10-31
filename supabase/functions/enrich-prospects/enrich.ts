// Enriquecimento de prospects a partir do site de cada empresa — só HTTP + regex, sem IA.
// Portado do google-maps-scraper-kit (MIT, scripts/scrape.py): e-mails, redes sociais,
// sinais de anúncio (pixels), plataforma do site, verificação de domínio de e-mail e nota de intenção.
// Sem APIs do Deno aqui: roda igual no Deno (Edge Function) e no Node (testes).

export interface EnrichOptions { emails: boolean; deep: boolean; socials: boolean; tech: boolean; verify: boolean }

export interface ProspectIn {
  id: string; website: string | null; email: string | null; emails: string[] | null;
  rating: number | null; reviews_count: number | null;
  instagram: string | null; facebook: string | null; tech: Tech | null;
}

export type Tech = Record<"fb_pixel" | "google_ads_tag" | "analytics" | "bing_ads" | "linkedin_insight" | "tiktok_pixel", boolean>
  & { cms: string | null; mobile_friendly: boolean };

export interface EnrichPatch {
  website?: string | null; email?: string | null; emails?: string[]; email_host?: string | null;
  instagram?: string | null; facebook?: string | null; linkedin?: string | null; tiktok?: string | null;
  youtube?: string | null; x_profile?: string | null; tech?: Tech | null; intent_score?: number;
  enriched_at: string; enrich_error: string | null;
}

const UA = "Mozilla/5.0 (compatible; SuperflowProspeccao/1.0)";
const MAX_BYTES = 400_000;

/* ------------------------------ Rede segura ------------------------------ */

const PRIVATE_V4 = [/^10\./, /^127\./, /^0\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];

/** Bloqueia endereços internos (o site vem de um cadastro público e pode apontar para a rede do servidor). */
export function isPublicHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return !PRIVATE_V4.some((r) => r.test(h));
  if (h.includes(":")) return !(h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80") || h === "::");
  return h.includes(".");
}

const withScheme = (url: string) => (/^https?:\/\//i.test(url) ? url : `http://${url}`);

export function hostOf(url: string): string {
  try {
    const h = new URL(withScheme(url)).hostname.toLowerCase();
    return h.startsWith("www.") ? h.slice(4) : h;
  } catch {
    return "";
  }
}

async function readLimited(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.length;
  }
  reader.cancel().catch(() => undefined);
  const all = new Uint8Array(Math.min(size, MAX_BYTES));
  let off = 0;
  for (const c of chunks) {
    const part = c.subarray(0, Math.min(c.length, all.length - off));
    all.set(part, off);
    off += part.length;
    if (off >= all.length) break;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(all);
}

/** Baixa o HTML de uma página pública (segue até 5 redirecionamentos, checando cada destino). */
export async function fetchHtml(url: string, timeoutMs = 8000): Promise<string> {
  let current = withScheme(url);
  for (let hop = 0; hop < 5; hop++) {
    let u: URL;
    try { u = new URL(current); } catch { return ""; }
    if (!/^https?:$/.test(u.protocol) || !isPublicHost(u.hostname)) return "";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(u, { redirect: "manual", signal: ctrl.signal, headers: { "User-Agent": UA, Accept: "text/html" } });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        current = new URL(res.headers.get("location") as string, u).toString();
        res.body?.cancel().catch(() => undefined);
        continue;
      }
      if (!res.ok) { res.body?.cancel().catch(() => undefined); return ""; }
      return await readLimited(res);
    } catch {
      return "";
    } finally {
      clearTimeout(timer);
    }
  }
  return "";
}

/* ------------------------------ Site ------------------------------ */

const TRACKING = ["utm_", "gclid", "fbclid", "msclkid", "mc_cid", "mc_eid"];

/** Tira parâmetros de rastreio (utm_…) e o fragmento do endereço do site. */
export function cleanWebsite(url: string | null): string | null {
  if (!url) return url;
  try {
    const u = new URL(withScheme(url));
    const before = u.search;
    [...u.searchParams.keys()].forEach((k) => { if (TRACKING.some((t) => k.toLowerCase().startsWith(t))) u.searchParams.delete(k); });
    if (u.search === before && !u.hash) return url;
    if (!u.hash.startsWith("#/") && !u.hash.startsWith("#!")) u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

/* ------------------------------ E-mails ------------------------------ */

const LOCAL = "[A-Za-z0-9._%+-]";
const EMAIL_RE = new RegExp(`(?<!${LOCAL})${LOCAL}+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}`, "g");
const EMAIL_FULL = new RegExp(`^${LOCAL}+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$`);
const MAILTO_RE = /mailto:([^"'>\s?]+)/gi;
const AT = String.raw`(?:\[\s*at\s*\]|\(\s*at\s*\)|\{\s*at\s*\}|\[\s*arroba\s*\]|\(\s*arroba\s*\))`;
const DOT = String.raw`(?:\[\s*dot\s*\]|\(\s*dot\s*\)|\{\s*dot\s*\}|\s+dot\s+|\[\s*ponto\s*\]|\(\s*ponto\s*\))`;
const TLD = "(?:com|net|org|co|io|biz|info|br|pt|us|uk|ca|au|de|fr|es|it|nl|eu|edu|gov|me|app|dev|shop|online|store|xyz|ai)";
const DEOBF_RE = new RegExp(`(?<!${LOCAL})(${LOCAL}+)\\s*${AT}\\s*([A-Za-z0-9.\\-]+?)\\s*${DOT}\\s*(${TLD})\\b`, "gi");
const JUNK_EXT = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif", ".css", ".js"];
const JUNK_DOMAIN = ["example", "sentry", "wixpress", "wix.com", "godaddy", "squarespace", "wordpress", "domain.com", "email.com",
  "yourdomain", "mysite.com", "seudominio", "seusite", "schema.org", "w3.org", "linktr.ee", "linkin.bio", "beacons.ai"];
const JUNK_LOCAL = new Set(["name", "email", "user", "you", "someone", "example", "username", "youremail", "yourname",
  "firstname", "lastname", "sample", "seuemail", "seunome", "nome", "exemplo", "contato@email"]);
const ESCAPE_PREFIX = /^(?:u00(?:3c|3e|22|27|26))+/;

export function isRealEmail(e: string): boolean {
  const at = e.lastIndexOf("@");
  const local = e.slice(0, at), dom = e.slice(at + 1);
  if (!EMAIL_FULL.test(e) || JUNK_EXT.some((x) => e.endsWith(x))) return false;
  return !JUNK_LOCAL.has(local) && !JUNK_DOMAIN.some((j) => dom.includes(j));
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function unescapeHtml(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, g: string) => {
    if (g[0] === "#") {
      const n = g[1].toLowerCase() === "x" ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[g.toLowerCase()] ?? m;
  });
}

function safeDecode(s: string) {
  try { return decodeURIComponent(s); } catch { return s; }
}

/** Até 3 e-mails da página (mailto, texto e "nome [arroba] site [ponto] com"), os do domínio do site primeiro. */
export function extractEmails(html: string, site: string | null): string[] {
  const domain = hostOf(site ?? "");
  const text = unescapeHtml(html ?? "").slice(0, MAX_BYTES);
  const raw = [
    ...[...text.matchAll(MAILTO_RE)].map((m) => m[1]),
    ...(text.match(EMAIL_RE) ?? []),
    ...[...text.matchAll(DEOBF_RE)].map((m) => `${m[1]}@${m[2]}.${m[3]}`),
  ];
  const found: string[] = [];
  for (const r of raw) {
    const e = safeDecode(r).trim().toLowerCase().replace(ESCAPE_PREFIX, "");
    if (isRealEmail(e) && !found.includes(e)) found.push(e);
  }
  const onSite = (e: string) => Boolean(domain) && (e.endsWith(`@${domain}`) || e.endsWith(`.${domain}`));
  return found.sort((a, b) => Number(onSite(b)) - Number(onSite(a))).slice(0, 3);
}

const HREF_RE = /<a\s[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const CONTACT_WORDS = /contact|contato|fale|about|sobre|quem-somos|team|equipe|support|atendimento/i;

/** Até 3 páginas de contato/sobre do mesmo site: as encontradas primeiro, depois caminhos comuns. */
export function contactLinks(html: string, base: string): string[] {
  const baseUrl = withScheme(base);
  const host = hostOf(baseUrl);
  if (!host) return [];
  const out: string[] = [];
  for (const m of (html ?? "").matchAll(HREF_RE)) {
    if (!CONTACT_WORDS.test(`${m[1]} ${m[2]}`)) continue;
    try {
      const u = new URL(m[1].trim(), baseUrl);
      u.hash = "";
      const s = u.toString();
      if (/^https?:/.test(u.protocol) && hostOf(s) === host && !out.includes(s)) out.push(s);
    } catch { /* link quebrado */ }
  }
  for (const path of ["/contato", "/contact", "/fale-conosco", "/sobre"]) {
    const s = new URL(path, baseUrl).toString();
    if (out.length < 3 && !out.includes(s)) out.push(s);
  }
  return out.slice(0, 3);
}

/* ------------------------------ Redes sociais ------------------------------ */

const SOCIAL_RE = {
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)/gi,
  facebook: /https?:\/\/(?:www\.|m\.|web\.|pt-br\.)?facebook\.com\/([A-Za-z0-9_.-]+)/gi,
  linkedin: /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|in|school)\/([A-Za-z0-9_.%-]+)/gi,
  tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/@([A-Za-z0-9_.]+)/gi,
  youtube: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/|user\/)([A-Za-z0-9_.-]+)/gi,
  x_profile: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([A-Za-z0-9_]{1,15})\b/gi,
} as const;
export type SocialKey = keyof typeof SOCIAL_RE;
const SKIP_HANDLE = new Set(["", "home", "pages", "people", "help", "about", "policies", "policy", "legal", "tos", "privacy",
  "settings", "sharer", "sharer.php", "tr", "profile.php", "plugins", "dialog", "intent", "login", "share.php", "permalink.php", "p", "reel",
  "reels", "explore", "stories", "tv", "watch", "events", "groups", "marketplace", "gaming", "photo", "hashtag", "search", "share", "i"]);

export function findSocials(html: string): Record<SocialKey, string | null> {
  const out = {} as Record<SocialKey, string | null>;
  for (const [key, rx] of Object.entries(SOCIAL_RE) as [SocialKey, RegExp][]) {
    out[key] = null;
    for (const m of (html ?? "").matchAll(rx)) {
      const h = m[1].toLowerCase();
      if (SKIP_HANDLE.has(h) || (key === "facebook" && (/^\d+$/.test(h) || h.length < 3))) continue;
      out[key] = m[0].replace(/["'/\\]+$/, "").replace(/\\/g, "");
      break;
    }
  }
  return out;
}

/* ------------------------------ Sinais de anúncio ------------------------------ */

const TECH_RE = {
  fb_pixel: /connect\.facebook\.net\/[^"']*fbevents\.js|fbq\(/i,
  google_ads_tag: /googleadservices\.com|AW-\d{6,}|googleads\.g\.doubleclick\.net/i,
  analytics: /googletagmanager\.com\/gtag|gtag\(|UA-\d{4,}|G-[A-Z0-9]{6,}/i,
  bing_ads: /bat\.bing\.com|window\.uetq/i,
  linkedin_insight: /snap\.licdn\.com|_linkedin_partner_id/i,
  tiktok_pixel: /analytics\.tiktok\.com|ttq\.load\(/i,
};
const CMS_RE: [string, RegExp][] = [
  ["wordpress", /\/wp-content\/|\/wp-includes\//i], ["shopify", /cdn\.shopify\.com|shopify\.theme/i],
  ["wix", /static\.wixstatic\.com|_wixcss|wix\.com/i], ["squarespace", /static1\.squarespace|squarespace\.com/i],
  ["webflow", /webflow\.com/i], ["nuvemshop", /nuvemshop|tiendanube/i], ["loja integrada", /lojaintegrada/i],
];
const VIEWPORT_RE = /<meta[^>]+name=["']viewport["']/i;

/** Sinais do site; null quando o site não abriu (desconhecido não vira "não tem pixel"). */
export function findTech(html: string): Tech | null {
  if (!html) return null;
  const t = Object.fromEntries(Object.entries(TECH_RE).map(([k, rx]) => [k, rx.test(html)])) as Tech;
  t.cms = CMS_RE.find(([, rx]) => rx.test(html))?.[0] ?? null;
  t.mobile_friendly = VIEWPORT_RE.test(html);
  return t;
}

/** 0–100: "já investe em marketing". Pixels pesam mais; empresa estabelecida e com contato soma um pouco. */
export function intentScore(p: { tech: Tech | null; reviews_count: number | null; rating: number | null; emails: string[] }): number {
  const t = p.tech;
  let s = t ? 35 * +t.fb_pixel + 25 * +t.google_ads_tag + 10 * +t.analytics : 0;
  const reviews = Number(p.reviews_count ?? 0);
  s += reviews >= 50 ? 15 : reviews >= 10 ? 8 : 0;
  s += Number(p.rating ?? 0) >= 4 ? 10 : 0;
  s += p.emails.length ? 5 : 0;
  return s;
}

/* ------------------------------ Verificação de e-mail ------------------------------ */

const mxCache = new Map<string, Promise<string>>();

/** Quem recebe os e-mails do domínio, via DNS público (sem chave): google_workspace, microsoft_365, other, none, nxdomain. */
export function mxHost(domain: string, fetcher: typeof fetch = fetch): Promise<string> {
  if (!mxCache.has(domain)) {
    mxCache.set(domain, (async () => {
      try {
        const res = await fetcher(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, { headers: { "User-Agent": UA } });
        const d = await res.json() as { Status?: number; Answer?: { type: number; data: string }[] };
        if (d.Status === 3) return "nxdomain";
        const mx = (d.Answer ?? []).filter((a) => a.type === 15).map((a) => a.data).join(" ").toLowerCase();
        if (!mx) return d.Status === 0 ? "none" : "";
        if (mx.includes("google.com") || mx.includes("googlemail.com")) return "google_workspace";
        return mx.includes("outlook.com") ? "microsoft_365" : "other";
      } catch {
        return "";
      }
    })());
  }
  return mxCache.get(domain) as Promise<string>;
}

/* ------------------------------ Um prospect ------------------------------ */

const currentEmails = (p: ProspectIn) => (p.emails?.length ? p.emails : p.email ? [p.email] : []);

async function emailsFor(p: ProspectIn, site: string, home: string, deep: boolean) {
  let found = extractEmails(home, site);
  if (deep && home && !found.length) {
    const pages = await Promise.all(contactLinks(home, site).map((u) => fetchHtml(u)));
    found = extractEmails(pages.join("\n"), site);
  }
  return found.length ? found : currentEmails(p);
}

async function verified(emails: string[]) {
  const checked = await Promise.all(emails.map(async (e) => [e, await mxHost(e.split("@")[1])] as const));
  const kept = checked.filter(([, h]) => h !== "nxdomain");
  return { emails: kept.map(([e]) => e), host: kept[0]?.[1] || null };
}

function socialsPatch(p: ProspectIn, html: string): Partial<EnrichPatch> {
  const s = findSocials(html);
  return {
    instagram: p.instagram || s.instagram, facebook: p.facebook || s.facebook, linkedin: s.linkedin,
    tiktok: s.tiktok, youtube: s.youtube, x_profile: s.x_profile,
  };
}

/** Visita o site uma vez e devolve só os campos pedidos. Nunca lança erro: falha vira enrich_error. */
export async function enrichOne(p: ProspectIn, o: EnrichOptions): Promise<EnrichPatch> {
  const now = new Date().toISOString();
  const site = cleanWebsite(p.website);
  let emails = currentEmails(p);
  if (!site) {
    return { enriched_at: now, enrich_error: "sem site", intent_score: intentScore({ tech: p.tech, reviews_count: p.reviews_count, rating: p.rating, emails }) };
  }
  const home = await fetchHtml(site);
  const patch: EnrichPatch = { website: site, enriched_at: now, enrich_error: home ? null : "site não abriu" };
  if (o.emails && !emails.length) emails = await emailsFor(p, site, home, o.deep);
  if (o.verify && emails.length) {
    const v = await verified(emails);
    emails = v.emails;
    patch.email_host = v.host;
  }
  patch.emails = emails;
  patch.email = emails[0] ?? null;
  if (o.socials) Object.assign(patch, socialsPatch(p, home));
  const tech = o.tech ? findTech(home) : p.tech;
  if (o.tech) patch.tech = tech;
  patch.intent_score = intentScore({ tech, reviews_count: p.reviews_count, rating: p.rating, emails });
  return patch;
}

/** Roda fn sobre a lista, n de cada vez. */
export async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}
