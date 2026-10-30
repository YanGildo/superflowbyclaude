// Segmento "Agência — Brasileiros na gringa": negócios de brasileiros no exterior.
import type { ScriptSeed } from "./types";

export const AGENCIA_GRINGA: ScriptSeed[] = [
  {
    title: "Prospecção fria — Instagram", category: "Prospecção", favorite: true, tags: ["prospecção", "instagram"],
    moment: "Primeira mensagem no direct para um negócio de brasileiro no exterior.",
    body: `Oi, [nome]! Tudo bem? Vi o perfil da [empresa] aqui em [cidade] e curti muito o trabalho de vocês 👏

Sou da RG Marketing, uma agência brasileira que ajuda brasileiros com negócio no exterior a conseguir mais clientes — tanto da comunidade brasileira quanto locais.

Posso te mandar 2 ideias rápidas que vi pra vocês atraírem mais clientes por aqui? Sem compromisso 🙂`,
  },
  {
    title: "Prospecção fria — WhatsApp", category: "Prospecção", tags: ["prospecção", "whatsapp"],
    moment: "Primeiro contato pelo WhatsApp (número público do negócio).",
    body: `Olá, [nome]! Aqui é o Yan, da RG Marketing 🇧🇷

Trabalho com negócios de brasileiros em [país] e vi que a [empresa] ainda [oportunidade — ex.: não aparece bem no Google / não tem site].

Isso costuma deixar clientes na mesa. Topa uma conversa de 15 minutos pra eu te mostrar o que dá pra melhorar? Faço por vídeo no horário que for melhor pra você (considerando o fuso daí).`,
  },
  {
    title: "Resposta a lead interessado", category: "Abordagem inicial", tags: ["abertura"],
    moment: "Quando o lead chega pedindo informação.",
    body: `Oi, [nome]! Que bom falar com você 🙌

A gente ajuda brasileiros com negócio no exterior a ter presença digital profissional: site/landing page, Google, anúncios e redes sociais — tudo em português e no idioma local.

Me conta rapidinho: qual é o seu negócio e onde você atende?`,
  },
  {
    title: "Diagnóstico — perguntas", category: "Diagnóstico", favorite: true, tags: ["diagnóstico", "qualificação"],
    moment: "Para entender o negócio antes de propor.",
    body: `Perfeito, [nome]! Pra eu montar algo que faça sentido pra [empresa]:

1. Hoje, de onde vêm a maioria dos seus clientes?
2. Seu público é mais brasileiro, local ou os dois?
3. Já tem site, Google Meu Negócio ou anúncios rodando?
4. Quantos clientes novos por mês você gostaria de ter?

Pode responder por áudio se for mais fácil 😉`,
  },
  {
    title: "Convite para reunião", category: "Reunião", tags: ["reunião", "agendamento"],
    moment: "Depois do diagnóstico, para marcar a call.",
    body: `Show, [nome]! Já tenho algumas ideias boas pra [empresa].

Vamos fazer uma call de 20 minutos pra eu te apresentar? Tenho estes horários (horário de [cidade]):
• [horário 1]
• [horário 2]

Qual fica melhor?`,
  },
  {
    title: "Confirmação de reunião", category: "Reunião", tags: ["reunião", "lembrete"],
    moment: "No dia da reunião.",
    body: `Bom dia, [nome]! Confirmando nossa conversa hoje às [horário] (horário de [cidade]) 🙂

Link: [link reunião]

Se precisar remarcar, é só me avisar.`,
  },
  {
    title: "Envio de proposta", category: "Proposta", favorite: true, tags: ["proposta"],
    moment: "Depois da reunião.",
    body: `[nome], obrigado pela conversa! Como combinamos, segue a proposta para a [empresa]:

✅ [serviço]
💰 Investimento: *[mensalidade]/mês* + setup de [valor setup]
📅 Começamos em até [prazo] após a aprovação
💳 Pagamento em [moeda] via [forma de pagamento]

Qualquer dúvida me chama. Podemos começar?`,
  },
  {
    title: "Follow-up da proposta", category: "Follow-up", tags: ["follow-up"],
    moment: "2 dias sem resposta à proposta.",
    body: `Oi, [nome]! Conseguiu dar uma olhada na proposta?

Se quiser, ajusto o escopo pra caber melhor no momento da [empresa] — dá pra começar menor e crescer junto 😉`,
  },
  {
    title: "Objeção: fuso e distância", category: "Fechamento", tags: ["objeção", "distância"],
    moment: "Quando o cliente tem receio de trabalhar com agência no Brasil.",
    body: `Entendo totalmente, [nome]. Por isso a gente trabalha assim:

• Atendimento no seu fuso, por WhatsApp e vídeo
• Relatório mensal com números claros
• Contrato com prazo mínimo curto — se não fizer sentido, você não fica preso

Hoje já atendemos negócios em [países] e o fuso nunca foi problema.`,
  },
  {
    title: "Fechamento — próximos passos", category: "Fechamento", tags: ["fechamento"],
    moment: "Quando o cliente aprova.",
    body: `Bem-vindo(a) à RG Marketing, [nome]! 🎉

Próximos passos:
1. Te mando o contrato pra assinar
2. Pagamento do setup: [forma de pagamento]
3. Você preenche um briefing rápido (10 min)
4. Reunião de kick-off pra começarmos

Já te envio tudo por aqui.`,
  },
  {
    title: "Onboarding — acessos", category: "Onboarding", tags: ["onboarding", "acessos"],
    moment: "Logo depois do fechamento.",
    body: `[nome], pra começarmos preciso destes acessos (pode ser aos poucos):

• Instagram / Facebook (Business)
• Google Meu Negócio
• Domínio e hospedagem do site (se tiver)
• Gerenciador de anúncios (se já usar)

Se tiver dúvida em algum, te mando um vídeo explicando como liberar 😉`,
  },
  {
    title: "Relatório mensal", category: "Relatório", tags: ["relatório"],
    moment: "Envio do resultado do mês.",
    body: `Oi, [nome]! Segue o resumo de [mês] da [empresa] 📊

• [resultado 1 — ex.: 32 contatos pelo site]
• [resultado 2 — ex.: custo por lead de US$ 4]
• [resultado 3]

Próximo mês vamos focar em [próximo foco]. Quer marcar 15 min pra eu te explicar com calma?`,
  },
  {
    title: "Upsell de novo serviço", category: "Upsell", tags: ["upsell"],
    moment: "Cliente satisfeito há alguns meses.",
    body: `[nome], com os resultados que tivemos em [serviço atual], acho que é a hora de dar o próximo passo: [novo serviço].

Isso deve ajudar a [benefício]. Posso te mandar uma proposta rápida?`,
  },
];
