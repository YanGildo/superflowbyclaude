// Segmento "Ensaio fotográfico com IA" (RG Studio). Base: scripts do Superflow antigo, revisados.
import type { ScriptSeed } from "./types";

export const ENSAIO_IA: ScriptSeed[] = [
  {
    title: "Abertura inicial", category: "Abordagem inicial", favorite: true, tags: ["abertura", "whatsapp"],
    moment: "Primeiro contato com quem chamou interessado.",
    body: `Oi, [nome]! Tudo bem? Aqui é do RG Studio 📸

Vi que você se interessou pelos nossos ensaios fotográficos com IA. A gente cria fotos realistas, com cara de estúdio profissional, usando as suas próprias fotos como base — então o resultado fica com os seus traços de verdade.

Pra eu te indicar o melhor caminho: o ensaio seria pra quê?
1️⃣ Foto profissional / LinkedIn
2️⃣ Aniversário ou data especial
3️⃣ Moda / editorial
4️⃣ Redes sociais
5️⃣ Outro`,
  },
  {
    title: "Abertura — lead de anúncio", category: "Abordagem inicial", tags: ["abertura", "anúncio"],
    moment: "Quando a pessoa veio de um anúncio e mandou só \"oi\" ou \"quero saber mais\".",
    body: `Oi, [nome]! Que bom que você chamou 😊

Esse é o ensaio que você viu no anúncio: fotos com qualidade de estúdio, sem sair de casa, feitas a partir de fotos que você já tem.

Posso te mostrar alguns resultados reais e os valores? Me diz só qual estilo você curte mais: profissional, casual, festa ou editorial.`,
  },
  {
    title: "Qualificação rápida", category: "Qualificação", tags: ["qualificação"],
    moment: "Para entender objetivo, prazo e quantidade antes de mandar os pacotes.",
    body: `Perfeito, [nome]! Só 3 perguntinhas pra eu montar a melhor opção pra você:

• Pra quando você precisa das fotos?
• Mais ou menos quantas fotos quer usar?
• Tem algum estilo, cenário ou referência em mente? (pode mandar print 😉)

Com isso eu já te mando o pacote ideal.`,
  },
  {
    title: "Apresentação de pacotes", category: "Pacotes e proposta", favorite: true, tags: ["pacotes", "valor"],
    moment: "Quando o cliente pede valores ou já respondeu a qualificação.",
    body: `Show, [nome]! Pelo que você me contou, essas são as melhores opções:

📦 *[pacote]* — [quantidade] fotos — *[valor]*
⏱️ Entrega em até [prazo]

Todas as fotos são criadas a partir das suas próprias imagens, com ajuste fino de pele, luz e cenário. Você recebe em alta resolução, pronto pra postar ou imprimir.

Quer que eu já reserve a sua vaga nesse pacote?`,
  },
  {
    title: "Pacotes — versão premium", category: "Pacotes e proposta", tags: ["pacotes", "premium"],
    moment: "Para quem valoriza qualidade e quer o resultado mais completo.",
    body: `[nome], pro que você quer, eu indicaria o nosso *[pacote]*:

✨ [quantidade] fotos em cenários diferentes
✨ Direção de estilo (roupa, luz e clima combinando com você)
✨ Retoque detalhado em cada foto
✨ Entrega em [prazo]

Investimento: *[valor]*

É o pacote que mais encanta, porque você recebe um ensaio completo, como se tivesse passado um dia num estúdio. Posso garantir pra você?`,
  },
  {
    title: "Cliente escolheu o pacote", category: "Fechamento", favorite: true, tags: ["fechamento"],
    moment: "Quando o cliente diz qual pacote quer.",
    body: `Ótima escolha, [nome]! O *[pacote]* fica lindo 🤩

Pra começar a produção eu preciso de 3 coisas:
1. Seu nome completo
2. De 3 a 5 fotos suas recentes, nítidas e com boa luz no rosto (se tiver uma de corpo inteiro ou meio corpo, melhor ainda)
3. Alguma preferência de cenário, roupa ou estilo — se não tiver, eu sugiro 😉

Assim que eu receber, já te passo os dados pra pagamento.`,
  },
  {
    title: "Pedido de fotos", category: "Coleta de fotos", favorite: true, tags: ["fotos", "coleta"],
    moment: "Para pedir as fotos de referência.",
    body: `[nome], me manda de 3 a 5 fotos suas, de preferência:

✅ Recentes e bem nítidas
✅ Com luz boa no rosto (luz de janela é ótima)
✅ Sem filtro e sem óculos escuros
✅ Uma de corpo inteiro ou meio corpo, se tiver

Quanto melhor a foto de base, mais fiel e realista fica o seu ensaio.`,
  },
  {
    title: "Fotos com baixa qualidade", category: "Coleta de fotos", tags: ["fotos", "qualidade"],
    moment: "Quando as fotos vieram escuras, desfocadas ou com filtro.",
    body: `Obrigado pelas fotos, [nome]! 🙏

Pra eu conseguir um resultado bem fiel, você consegue me mandar mais 2 ou 3 com:
• rosto bem nítido (sem tremido)
• luz de frente (perto de uma janela funciona muito bem)
• sem filtro de beleza

Pode tirar agora mesmo com o celular, não precisa ser nada produzido 😉`,
  },
  {
    title: "Dados para pagamento", category: "Pagamento", favorite: true, tags: ["pagamento", "pix"],
    moment: "Depois que o cliente confirmou o pacote.",
    body: `Fechado, [nome]! Confirmando seu pedido:

📦 Pacote: [pacote]
🖼️ Fotos: [quantidade]
⏱️ Prazo: [prazo]
💰 Investimento: *[valor]*

Pagamento via Pix:
[chave PIX]

Assim que pagar, me manda o comprovante por aqui que eu já coloco seu ensaio na fila de produção 🚀`,
  },
  {
    title: "Pagamento confirmado", category: "Pagamento", favorite: true, tags: ["pagamento", "confirmação"],
    moment: "Quando o comprovante chega.",
    body: `Pagamento confirmado! Muito obrigado, [nome] 🙌

Seu ensaio já entrou em produção. O prazo é de até [prazo] e eu te aviso por aqui assim que ficar pronto.

Qualquer ideia nova de cenário ou estilo nesse meio-tempo, pode me mandar!`,
  },
  {
    title: "Oferta de entrega expressa", category: "Upsell", tags: ["upsell", "expressa"],
    moment: "Logo após o pagamento, para quem tem pressa.",
    body: `[nome], seu pedido segue no prazo padrão de [prazo].

Se precisar antes, tenho a *entrega expressa*: você recebe em até [prazo expresso] por mais [valor expresso].

Quer adicionar? Se não, tá tudo certo e seguimos no prazo normal 😉`,
  },
  {
    title: "Recusou a entrega expressa", category: "Upsell", tags: ["upsell"],
    moment: "Quando o cliente prefere o prazo normal.",
    body: `Combinado, [nome]! Seguimos no prazo padrão de [prazo]. Já tô cuidando de tudo pra ficar incrível ✨`,
  },
  {
    title: "Fotos extras", category: "Upsell", tags: ["upsell", "fotos extras"],
    moment: "Na entrega, quando o cliente amou o resultado.",
    body: `Que bom que você amou, [nome]! 😍

Se quiser ampliar o ensaio, consigo criar mais [quantidade] fotos em cenários novos por *[valor]* — aproveitando as mesmas fotos de base, então sai bem rápido.

Quer que eu já separe uns cenários pra você escolher?`,
  },
  {
    title: "Follow-up após proposta", category: "Follow-up", favorite: true, tags: ["follow-up"],
    moment: "1 dia depois de mandar os valores sem resposta.",
    body: `Oi, [nome]! Passando pra saber se ficou alguma dúvida sobre o *[pacote]* 😊

Se quiser, te mando mais alguns exemplos de ensaios que fizemos essa semana.`,
  },
  {
    title: "Follow-up com urgência leve", category: "Follow-up", tags: ["follow-up", "urgência"],
    moment: "2 a 3 dias sem resposta.",
    body: `[nome], tudo bem? Tô fechando a agenda de produção da semana e ainda tenho [quantidade] vagas.

Se quiser garantir seu ensaio com entrega em [prazo], consigo reservar uma pra você hoje. Te seguro a vaga?`,
  },
  {
    title: "Último follow-up", category: "Follow-up", tags: ["follow-up", "encerramento"],
    moment: "Última tentativa, sem pressionar.",
    body: `Oi, [nome]! Vou parar de te chamar pra não incomodar 😅

Quando quiser fazer seu ensaio, é só mandar um "quero" aqui que eu retomo de onde paramos. Até mais!`,
  },
  {
    title: "Objeção: \"vou pensar\"", category: "Objeções", tags: ["objeção"],
    moment: "Quando o cliente diz que vai pensar.",
    body: `Claro, [nome], fica à vontade!

Só pra eu te ajudar: o que pesou mais — valor, prazo ou se o resultado vai ficar parecido com você? Se for isso, te mando exemplos de antes e depois agora mesmo 😉`,
  },
  {
    title: "Objeção: \"está caro\"", category: "Objeções", tags: ["objeção", "preço"],
    moment: "Quando o cliente acha o valor alto.",
    body: `Entendo, [nome]! Pensa assim: um ensaio em estúdio sai bem mais caro, com deslocamento, maquiagem e horário marcado — e aqui você recebe [quantidade] fotos sem sair de casa.

Se fizer mais sentido agora, tenho uma opção mais enxuta por *[valor]*. Quer ver?`,
  },
  {
    title: "Objeção: \"vai ficar parecido comigo?\"", category: "Objeções", tags: ["objeção", "prévia"],
    moment: "Quando o cliente tem medo de não ficar parecido ou pede prévia.",
    body: `Ótima pergunta, [nome]! É justamente por isso que pedimos as suas fotos: o ensaio é feito em cima dos seus traços reais.

Te mando alguns antes e depois de clientes pra você ver: [link exemplos]

E se alguma foto não ficar com a sua cara, a gente ajusta sem custo.`,
  },
  {
    title: "Preferência de cenário e estilo", category: "Produção", tags: ["produção", "estilo"],
    moment: "Antes de começar a produção.",
    body: `[nome], pra deixar o ensaio com a sua cara, me conta:

• Cenário: estúdio, cidade, natureza, praia, escritório…?
• Roupa ou cor que você gosta de usar?
• Clima: mais sério, elegante ou descontraído?

Se tiver alguma foto de referência, pode mandar também 💡`,
  },
  {
    title: "Entrega do ensaio", category: "Pós-venda", tags: ["entrega"],
    moment: "Quando as fotos ficam prontas.",
    body: `[nome], seu ensaio ficou pronto! 🎉

Aqui estão as suas fotos do *[pacote]*. Me conta qual foi a sua favorita 😍

Se quiser algum ajuste fino, é só falar que eu resolvo.`,
  },
  {
    title: "Pedido de depoimento", category: "Depoimentos / indicação", tags: ["depoimento"],
    moment: "1 ou 2 dias depois da entrega.",
    body: `Oi, [nome]! Que bom que você curtiu o ensaio 🙏

Me ajuda muito se você puder:
• mandar um áudio ou texto rapidinho contando o que achou, ou
• postar uma foto nos stories marcando o [instagram]

Isso ajuda outras pessoas a confiarem no nosso trabalho 💙`,
  },
  {
    title: "Indicação e recompra", category: "Depoimentos / indicação", tags: ["indicação", "recompra"],
    moment: "Para gerar indicação ou um novo ensaio.",
    body: `[nome], adorei fazer o seu ensaio! 🙌

Se você indicar alguém, essa pessoa ganha um desconto especial e você ganha [benefício] no seu próximo ensaio. É só a pessoa falar que veio por você.

E quando quiser um estilo novo, me chama que a gente cria 😉`,
  },
];
