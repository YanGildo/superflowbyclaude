# Motor de prospecção (Google Maps)

Busca empresas no Google Maps **sem Apify e sem chave de API**. É o motor open source
[gosom/google-maps-scraper](https://github.com/gosom/google-maps-scraper), na versão fixa usada pelo
[google-maps-scraper-kit](https://github.com/Mahanaicoach/google-maps-scraper-kit) (MIT), com um
"porteiro" na frente que exige senha e só atende o Superflow.

O Superflow fala com o motor **direto do seu navegador**. Por isso, no modo PC, as buscas só
rodam com o PC ligado e o Docker aberto. E-mails, redes sociais, sinais de anúncio e verificação
de e-mail rodam no Supabase (botão **Enriquecer**) e não dependem do motor.

## Ligar no Windows (uma vez)

1. Instale o **Docker Desktop** (docker.com) e deixe ele **aberto**.
2. No PowerShell, dentro desta pasta (`motor-prospeccao`):
   ```
   copy .env.example .env
   notepad .env        # troque MOTOR_SENHA e salve
   docker compose up -d
   ```
   A primeira vez baixa ~600 MB. Depois liga em segundos.
3. No Superflow: **Prospecção → Configurações → Motor de busca**
   - Motor: **Motor próprio**
   - Endereço: `http://localhost:8090`
   - Senha: a mesma do `.env`
   - **Testar conexão**. Se o Chrome perguntar se o site pode acessar a rede local, clique em **Permitir**.

## Dia a dia

- Ligar: `docker compose up -d` (com `restart: unless-stopped`, ele volta sozinho quando o Docker abre).
- Desligar: `docker compose down`
- Travou (busca parada em "pendente"): `docker restart superflow-motor`
- Atualizar o motor: troque a versão da imagem no `docker-compose.yml` e rode `docker compose up -d`.

## Limites honestos (do próprio kit)

- O Google mostra no máximo ~120 empresas por busca. Use **Grade** (divide a cidade em quadrados).
- Muitas buscas seguidas podem fazer o Google limitar seu IP por minutos ou horas. Sua conta Google não é afetada.
  Para volume alto, use proxies (campo "Proxies" na busca).
- E-mail só aparece se a empresa publica no site.
- Use os dados com responsabilidade (LGPD): prospecção B2B, com opção de descadastro.

## Num servidor (opcional, para usar fora de casa)

Mesma pasta, numa VPS com Docker: `MOTOR_BIND=0.0.0.0`, senha forte e **HTTPS** na frente
(Caddy, ou Cloudflare Tunnel). No Superflow, troque o endereço para `https://motor.seudominio.com`.
IPs de servidor são bloqueados pelo Google com mais facilidade, então vale usar proxies residenciais.
