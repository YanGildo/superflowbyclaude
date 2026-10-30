// Segmento "Agência — Brasil": negócios locais e prestadores de serviço.
import type { ScriptSeed } from "./types";

export const AGENCIA_BRASIL: ScriptSeed[] = [
  {
    title: "Prospecção — negócio local", category: "Prospecção", favorite: true, tags: ["prospecção", "whatsapp"],
    moment: "Primeiro contato com um negócio encontrado na prospecção (Google Maps).",
    body: `Oi, [nome]! Tudo bem? Aqui é o Yan, da RG Marketing.

Vi a [empresa] no Google aqui em [cidade] — vocês têm ótimas avaliações 👏 Notei que [oportunidade — ex.: o perfil não tem site / quase não posta no Instagram].

Isso costuma fazer o cliente escolher o concorrente. Posso te mandar uma análise rápida e gratuita do que dá pra melhorar?`,
  },
  {
    title: "Prospecção — Instagram", category: "Prospecção", tags: ["prospecção", "instagram"],
    moment: "Primeira mensagem no direct.",
    body: `Oi, [nome]! Adorei o trabalho da [empresa] 😍

Trabalho com marketing para [segmento] e vi algumas oportunidades no perfil de vocês pra transformar seguidores em clientes.

Posso te mandar 2 ideias práticas por aqui? Sem compromisso.`,
  },
  {
    title: "Resposta a lead interessado", category: "Abordagem inicial", tags: ["abertura"],
    moment: "Quando o lead chega pelo anúncio ou indicação.",
    body: `Oi, [nome]! Que bom que você chamou 🙌

A RG Marketing cuida do marketing de negócios como o seu: anúncios, redes sociais, site e Google — pra trazer mais clientes de forma previsível.

Me conta: qual é o seu negócio e qual é o maior desafio hoje pra vender mais?`,
  },
  {
    title: "Diagnóstico — perguntas", category: "Diagnóstico", favorite: true, tags: ["diagnóstico"],
    moment: "Para entender o negócio antes de propor.",
    body: `Perfeito, [nome]! Pra eu montar a melhor estratégia pra [empresa]:

1. Como os clientes chegam até você hoje?
2. Quanto custa, em média, o seu produto/serviço?
3. Já investiu em anúncios? Como foi?
4. Quantos clientes novos por mês seria um bom resultado?

Pode responder por áudio, fica mais fácil 😉`,
  },
  {
    title: "Convite para reunião", category: "Reunião", tags: ["reunião"],
    moment: "Depois do diagnóstico.",
    body: `Show, [nome]! Com essas informações já consigo te mostrar um plano.

Vamos marcar 20 minutos (online ou aí na [empresa])? Tenho:
• [horário 1]
• [horário 2]

Qual fica melhor pra você?`,
  },
  {
    title: "Lembrete de reunião", category: "Reunião", tags: ["reunião", "lembrete"],
    moment: "No dia da reunião.",
    body: `Bom dia, [nome]! Nossa conversa está confirmada hoje às [horário] 🙂

[link reunião ou endereço]

Qualquer imprevisto, me avisa que a gente remarca.`,
  },
  {
    title: "Envio de proposta", category: "Proposta", favorite: true, tags: ["proposta"],
    moment: "Depois da reunião.",
    body: `[nome], obrigado pelo tempo hoje! Segue a proposta da [empresa]:

✅ [serviço]
💰 *[mensalidade]/mês* + implantação de [valor setup]
📅 Início em até [prazo] após a aprovação
📊 Relatório mensal com os resultados

Faz sentido pra você? Se quiser, ajusto alguma parte.`,
  },
  {
    title: "Follow-up da proposta", category: "Follow-up", tags: ["follow-up"],
    moment: "2 dias sem resposta.",
    body: `Oi, [nome]! Conseguiu ver a proposta? 😊

Se o momento estiver apertado, dá pra começar só com [serviço menor] e ir crescendo conforme os resultados aparecem.`,
  },
  {
    title: "Objeção: \"já tentei e não funcionou\"", category: "Fechamento", tags: ["objeção"],
    moment: "Quando o cliente já teve experiência ruim com agência ou anúncio.",
    body: `Entendo demais, [nome] — isso é bem comum. Normalmente acontece por falta de acompanhamento ou de uma oferta clara.

Aqui a gente trabalha com metas e relatório todo mês: você vê exatamente quanto investiu e quantos contatos vieram. E o contrato mínimo é de [prazo mínimo], pra você testar com segurança.`,
  },
  {
    title: "Fechamento — próximos passos", category: "Fechamento", tags: ["fechamento"],
    moment: "Quando o cliente aprova.",
    body: `Seja bem-vindo(a), [nome]! 🎉

Próximos passos:
1. Te envio o contrato
2. Pagamento da implantação via [forma de pagamento]
3. Briefing rápido sobre a [empresa]
4. Reunião de início

Já te mando tudo por aqui!`,
  },
  {
    title: "Onboarding — acessos e materiais", category: "Onboarding", tags: ["onboarding"],
    moment: "Logo após o fechamento.",
    body: `[nome], pra começarmos, preciso de:

• Acesso ao Instagram/Facebook (Business)
• Google Meu Negócio
• Logo e fotos do negócio/produtos
• Lista dos produtos/serviços com preços

Pode ir mandando aos poucos. Qualquer dúvida pra liberar algum acesso, te mando um vídeo explicando.`,
  },
  {
    title: "Relatório mensal", category: "Relatório", tags: ["relatório"],
    moment: "Envio dos resultados do mês.",
    body: `Oi, [nome]! Resumo de [mês] da [empresa] 📊

• [resultado 1 — ex.: 85 contatos pelo WhatsApp]
• [resultado 2 — ex.: custo por contato de R$ 6]
• [resultado 3]

Para o próximo mês: [próximo foco]. Quer que eu te explique por vídeo?`,
  },
  {
    title: "Pós-venda — indicação", category: "Pós-venda", tags: ["pós-venda", "indicação"],
    moment: "Cliente satisfeito.",
    body: `[nome], fico muito feliz com os resultados da [empresa] 🙌

Se você conhecer outro empresário que também quer crescer, me indica? Quem vem por indicação ganha [benefício] e você também.`,
  },
  {
    title: "Upsell de novo serviço", category: "Upsell", tags: ["upsell"],
    moment: "Depois de alguns meses de bons resultados.",
    body: `[nome], com o [serviço atual] rodando bem, acho que o próximo passo é [novo serviço] — isso deve ajudar a [benefício].

Posso te mandar uma proposta rápida?`,
  },
];
