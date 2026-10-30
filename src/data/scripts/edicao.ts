// Segmento "Edição de fotos": restauração, melhoria, troca de fundo, composição.
import type { ScriptSeed } from "./types";

export const EDICAO: ScriptSeed[] = [
  {
    title: "Abertura inicial", category: "Abordagem inicial", favorite: true, tags: ["abertura"],
    moment: "Primeiro contato de quem quer editar uma foto.",
    body: `Oi, [nome]! Tudo bem? Aqui é do RG Studio 📸

A gente faz edição profissional de fotos: restauração de fotos antigas, melhoria de qualidade, troca de fundo, remoção de objetos e montagens.

Me manda a foto que você quer editar e me conta o que gostaria de mudar, que eu já te passo o valor 😉`,
  },
  {
    title: "Entender o pedido", category: "Qualificação", tags: ["qualificação"],
    moment: "Depois que o cliente mandou a foto.",
    body: `Recebi, [nome]! Pra eu te passar o valor certinho:

• O que você quer mudar nessa foto? (fundo, cor, nitidez, tirar algo/alguém…)
• Vai usar onde? (impressão, redes sociais, documento, quadro)
• Pra quando você precisa?`,
  },
  {
    title: "Orçamento de edição", category: "Pacotes e proposta", favorite: true, tags: ["orçamento", "valor"],
    moment: "Para mandar o valor da edição.",
    body: `[nome], analisei a sua foto ✅

O que vou fazer: [serviço]
💰 Valor: *[valor]*
⏱️ Entrega: até [prazo]
🖼️ Arquivo em alta resolução, pronto pra imprimir ou postar

Se tiver mais fotos, faço um valor especial pro pacote. Posso começar?`,
  },
  {
    title: "Restauração de foto antiga", category: "Pacotes e proposta", tags: ["restauração"],
    moment: "Quando a foto é antiga, rasgada, manchada ou desbotada.",
    body: `Que foto especial, [nome] 🥹

Dá pra recuperar sim: corrijo rasgos, manchas e riscos, devolvo nitidez e, se você quiser, posso até colorir.

• Restauração: *[valor]*
• Restauração + colorização: *[valor colorida]*
Entrega em até [prazo].

Fica lindo pra imprimir e dar de presente. Qual opção você prefere?`,
  },
  {
    title: "Pacote com várias fotos", category: "Pacotes e proposta", tags: ["pacote", "volume"],
    moment: "Quando o cliente tem várias fotos para editar.",
    body: `[nome], pra [quantidade] fotos consigo fazer um valor de pacote: *[valor]* no total (sai bem mais em conta que por unidade).

Entrego tudo junto em até [prazo]. Fechamos assim?`,
  },
  {
    title: "Confirmar e pagar", category: "Fechamento", favorite: true, tags: ["fechamento", "pagamento"],
    moment: "Quando o cliente aprova o orçamento.",
    body: `Combinado, [nome]! Resumo do pedido:

🖼️ [quantidade] foto(s) — [serviço]
⏱️ Entrega em até [prazo]
💰 *[valor]*

Pix: [chave PIX]

Me manda o comprovante por aqui que eu já começo a edição.`,
  },
  {
    title: "Pagamento confirmado", category: "Pagamento", tags: ["pagamento"],
    moment: "Quando chega o comprovante.",
    body: `Pagamento confirmado, [nome]! Obrigado 🙌

Já comecei a sua edição. Em até [prazo] te mando o resultado por aqui.`,
  },
  {
    title: "Prévia para aprovação", category: "Produção", tags: ["prévia", "aprovação"],
    moment: "Para mostrar a prévia antes de finalizar.",
    body: `[nome], olha como está ficando 👀

Essa é a prévia (com marca d'água). Se quiser algum ajuste — cor, luz, fundo — me fala agora que eu acerto antes de finalizar. Tá aprovado?`,
  },
  {
    title: "Entrega da edição", category: "Entrega", tags: ["entrega"],
    moment: "Quando a edição fica pronta.",
    body: `Prontinho, [nome]! 🎉

Aqui está a sua foto editada em alta resolução. Pra imprimir, recomendo papel fotográfico fosco — fica lindo.

Qualquer ajuste, é só me chamar!`,
  },
  {
    title: "Objeção: \"está caro\"", category: "Objeções", tags: ["objeção", "preço"],
    moment: "Quando o cliente acha caro.",
    body: `Entendo, [nome]! Esse valor é porque a edição é feita à mão, detalhe por detalhe — não é filtro automático, por isso fica natural.

Se ajudar, consigo fazer uma versão mais simples ([serviço simples]) por *[valor]*. Quer?`,
  },
  {
    title: "Follow-up do orçamento", category: "Follow-up", tags: ["follow-up"],
    moment: "1 a 2 dias sem resposta ao orçamento.",
    body: `Oi, [nome]! Conseguiu ver o orçamento da sua foto? 😊

Se quiser, faço uma prévia rápida pra você ver como fica antes de decidir.`,
  },
  {
    title: "Pós-venda e indicação", category: "Pós-venda", tags: ["pós-venda", "indicação"],
    moment: "Alguns dias depois da entrega.",
    body: `[nome], gostou de como ficou a foto? 💙

Se tiver mais fotos antigas da família, posso restaurar todas com um valor especial. E se puder me marcar no [instagram] mostrando o antes e depois, ajuda demais!`,
  },
];
