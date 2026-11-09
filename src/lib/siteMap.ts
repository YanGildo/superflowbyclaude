// Mapa dos domínios e subdomínios da RG Marketing (Vercel). ATUALIZE ao ligar ou remover um domínio.
// Última conferência com a Vercel: 09/11/2026.

export interface DomainEntry { host: string; what: string; project: string; kind: "agencia" | "subdominio" | "cliente" | "antigo" | "sistema"; note?: string; pending?: boolean }

export const DOMAINS: DomainEntry[] = [
  { host: "rgmarketingbr.com", what: "Site da agência (principal)", project: "rg-marketing-us", kind: "agencia", note: "www.rgmarketingbr.com redireciona para este." },
  { host: "rgstudio.rgmarkenting.com", what: "RG Studio · Ensaios AI", project: "rgstudio-ai", kind: "subdominio", note: "Endereço atual do RG Studio (domínio antigo)." },
  { host: "rgstudio.rgmarketingbr.com", what: "RG Studio · Ensaios AI (endereço novo)", project: "rgstudio-ai", kind: "subdominio", pending: true, note: "O site já aponta para ele, mas falta criar o CNAME no Hostinger e adicionar o domínio no projeto da Vercel." },
  { host: "rgmarkenting.com", what: "Domínio antigo (escrito com K)", project: "rg-marketing-us", kind: "antigo", note: "Ainda ligado ao site; www.rgmarkenting.com é o endereço que responde." },
  { host: "superflowbyclaude.vercel.app", what: "Superflow (este sistema)", project: "superflowbyclaude", kind: "sistema" },
  { host: "samantharelocation.com", what: "Samantha Relocation", project: "samantha-relocation", kind: "cliente", note: "www.samantharelocation.com é o endereço principal." },
  { host: "recantoguriatan.com", what: "Recanto Guriatan", project: "recanto-guriatan", kind: "cliente" },
  { host: "sportpumpsol.com", what: "Sport Pump", project: "sptspp", kind: "cliente" },
  { host: "fluencydash.vercel.app", what: "Fluency Dash (app de inglês)", project: "fluencydash", kind: "sistema" },
  { host: "heosmaiko-d20c715e.vercel.app", what: "Método HEOS", project: "heosmaiko-d20c715e", kind: "cliente" },
];

export const KIND_LABEL: Record<DomainEntry["kind"], string> = {
  agencia: "Agência", subdominio: "Subdomínio", cliente: "Cliente", antigo: "Antigo", sistema: "Sistema",
};

export interface SitePage { path: string; titulo: string; tipo: string; indexavel: boolean }
export const SITE_PAGES_URL = "https://rgmarketingbr.com/paginas.json";
