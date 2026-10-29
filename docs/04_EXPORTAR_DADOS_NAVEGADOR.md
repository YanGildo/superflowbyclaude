# Exportar os dados que estão só no navegador (Lovable)

Quase tudo do Superflow atual (tarefas gerais, projetos, metas, funis, CRM da agência, marketing, scripts, financeiro da planilha, os espaços) fica salvo **só no navegador**. Se você limpar o navegador ou trocar de computador, perde.

Faça isto **agora** como backup, e de novo logo antes de migrar para a versão nova.

## Passo a passo

1. Abra o Superflow no navegador e no computador que você mais usa, já logado.
2. Aperte **F12** e clique na aba **Console**.
3. Se o Chrome pedir, digite `allow pasting` e aperte Enter.
4. Cole o código abaixo e aperte **Enter**.
5. Vai baixar um arquivo `superflow-backup-AAAA-MM-DD.json`. Guarde esse arquivo.

```js
(() => {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!/^(flowboard|fb-|fb:|sb-)/i.test(k)) continue;
    if (k === "fb-auth-store" || (k.startsWith("sb-") && k.includes("auth-token"))) continue; // não exporta login
    try { data[k] = JSON.parse(localStorage.getItem(k)); }
    catch { data[k] = localStorage.getItem(k); }
  }
  const resumo = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, JSON.stringify(v).length]));
  console.table(resumo);
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), origin: location.origin, data }, null, 2)],
                        { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `superflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  console.log(`OK: ${Object.keys(data).length} blocos de dados exportados.`);
})();
```

## Se você usa em mais de um computador ou no celular

Cada navegador tem dados diferentes. Rode o script em cada um deles e guarde todos os arquivos.

## O que o arquivo contém

Chaves principais (nomes técnicos dos dados):

| Chave | Conteúdo |
|---|---|
| `flowboard-ai-v6` | Tarefas gerais, projetos, metas, fluxos, clientes, vendas, ofertas, financeiro simples |
| `flowboard-finance-v2` | Planilha financeira: entradas, despesas, contas, reservas, metas |
| `flowboard-agency-v1` | Agência: clientes, campanhas, conteúdos, entregas, propostas |
| `flowboard-funnels-v1` | Funis visuais |
| `fb-scripts-store-v1` | Scripts de atendimento |
| `fb-marketing-store-v1`, `fb-video-production-store-v1` | Marketing e produção de vídeos |
| `flowboard-spaces-v1` | Espaços, membros, convites |
| `flowboard-contact-log-v1`, `flowboard-conversions-v1` | Registro de contatos e conversões |

Os dados que **já estão no Supabase** do Lovable (Tasks, contas a pagar/receber, dívidas, cartões, contas bancárias, prospecção) não estão nesse arquivo. Eles serão copiados direto do banco na migração.

> O arquivo não leva sua senha nem a sessão de login. Mesmo assim, contém dados de clientes: não compartilhe publicamente.
