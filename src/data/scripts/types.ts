/** Script pronto para carregar num segmento. Variáveis entre colchetes: [nome], [valor]... */
export interface ScriptSeed {
  title: string;
  category: string;
  moment: string;
  body: string;
  tags: string[];
  favorite?: boolean;
  channel?: string;
}
