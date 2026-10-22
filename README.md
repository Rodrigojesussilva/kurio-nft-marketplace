# Kurio NFT Marketplace

Marketplace demonstrativo responsivo feito em React e TypeScript. Usa TanStack Router, TanStack Query, Axios, MSW e Socket.IO client. Os mocks funcionam em desenvolvimento, testes e build de demonstração; não há backend privado, blockchain ou cobrança real.

## Requisitos

- Node.js 22.12+ (ou 20.19+) e npm.
- Instalação reproduzível: `npm ci` (usa `package-lock.json`).

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev:mocks` | Vite em desenvolvimento com MSW. |
| `npm run dev` | Atalho para desenvolvimento; `.env.development` habilita MSW. |
| `npm run build:mocks` | TypeScript e build de demonstração com MSW habilitado. |
| `npm run build` | TypeScript e build conforme `.env.production` (MSW habilitado por padrão). |
| `npm run preview` | Serve o build local de produção na porta 4173. |
| `npm run typecheck` | Verifica tipos TypeScript. |
| `npm run lint` | Executa Oxlint. |
| `npm run assets:optimize` | Regenera as versões WebP locais a partir dos PNGs originais com Chromium. |
| `npm run test:e2e` | Executa 25 fluxos Playwright em Chromium desktop, tablet (768 px) e mobile. Instale o navegador com `npx playwright install chromium`. |
| `npm run test:visual` | Compara snapshots visuais de Início, Detalhe, Carrinho e Pagamento em 390, 768 e 1440 px. |
| `npm run test:visual:update` | Atualiza deliberadamente as baselines visuais. |
| `npm run test:e2e:report` | Abre o relatório HTML da última execução E2E. |
| `npm run audit:lighthouse` | Cria build otimizado e executa três auditorias por rota e perfil; grava HTML/JSON em `reports/lighthouse`. |

Para executar o preview: `npm run build:mocks`, depois `npm run preview`. O build é uma SPA; Vercel usa `vercel.json` para servir `index.html` nas rotas diretas. `public/mockServiceWorker.js` precisa ser publicado junto com os arquivos em `dist`.

## Configuração e variáveis

`.env.development` e `.env.production` definem `VITE_MOCKS=true`. Para trocar, defina `VITE_MOCKS=false`; sem MSW, a aplicação espera uma API compatível na mesma origem em `/api` e um servidor Socket.IO em `/socket.io`. Não há credenciais ou serviços remotos necessários no modo padrão. Nunca inclua tokens reais em variáveis `VITE_*`, pois elas são incorporadas ao bundle público.

## Contas fictícias

- `ana@kurio.test` / `kurio123`
- `caio@kurio.test` / `kurio123`

As contas e senhas são fixtures locais; o hash da senha é guardado no armazenamento de demonstração. Dados são persistidos por navegador e separados pelo identificador da conta. Isso não é autenticação segura para produção.

## Cenários reproduzíveis

O cenário pode ser selecionado por `?scenario=NOME` ou gravado no console do navegador:

```js
localStorage.setItem('kurio-scenario', 'offline')
location.reload()
```

Valores: `standard`, `slow`, `variable-latency`, `offline`, `network-timeout`, `http-500`, `empty`, `sold-out`, `expired-session`, `short-session`, `mutation-failure`, `price-changed`, `timeout-after-create`, `payment-rejected`, `payment-rejected-after-pending`, `rejected-order`, `socket-disconnect-once` e `socket-disconnect-pending-order`.

Login e cadastro removem o cenário ativo antes de autenticar, para a falha não bloquear a entrada. Para um cenário de checkout ou sessão, autentique primeiro e selecione o cenário depois. `slow` adiciona latência fixa; `variable-latency` alterna respostas rápidas e lentas; `offline`, `network-timeout` e `http-500` exercitam falhas; `empty` e `sold-out` cobrem estados sem resultado e sem disponibilidade; `expired-session` e `short-session` cobrem sessão inválida/curta; `mutation-failure` falha ao salvar favorito; `price-changed` altera cotação e emite `nft.updated`; `timeout-after-create` simula timeout recuperável por idempotência; `payment-rejected` recusa antes da criação; `payment-rejected-after-pending` emite recusa terminal; os dois cenários `socket-disconnect-*` exercitam reconexão.

Reset completo do estado da demonstração:

```js
await fetch('/api/scenario/reset', { method: 'POST' })
location.reload()
```

O endpoint restaura os fixtures, remove sessão, carrinhos, cenário e dados locais auxiliares. Em Playwright, cada teste deve usar contexto isolado quando depender de estado limpo.

## Contratos REST e eventos

Todos os caminhos REST usam o prefixo `/api`. Os contratos TypeScript e Axios estão em `src/lib/api.ts`; os handlers e fixtures compartilhados estão em `src/mocks/handlers.ts` e `src/mocks/fixtures.ts`.

| Recurso | Operações principais |
| --- | --- |
| Sessão e conta | `POST /session/register`, `POST /session/login`, `GET /session`, `POST /session/logout`; token Bearer fictício com expiração. |
| NFTs | `GET /nfts` com busca, filtros, ordenação e paginação; `GET /nfts/:id`. |
| Favoritos | `GET /favorites`, `POST /favorites/:id`, `DELETE /favorites/:id`. |
| Carrinho | `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:nftId/:editionId`, `DELETE /cart/items/:nftId/:editionId`. |
| Cotação | `POST /quote`; valida disponibilidade, versões, cupom, descontos, taxas e total. |
| Pedidos | `POST /orders` exige `Idempotency-Key`; `GET /orders/:id` recupera pedido/recibo. |
| Perfil | `GET/PATCH /profile`, `POST /profile/password`. |
| Carteiras | `GET/POST /wallets`, `PATCH/DELETE /wallets/:id`. |
| Mock | `POST /scenario/reset` restaura cenário conhecido. |

Erros REST têm formato `{ "error": { "code", "message", "details?" } }` e usam status HTTP para validação, sessão inválida, autorização, recurso inexistente, conflito, indisponibilidade, timeout e falhas transitórias. Valores ETH são strings decimais; cálculos usam inteiros em wei. `POST /orders` salva o fingerprint do conteúdo e o usuário junto da chave de idempotência: a mesma chave/conteúdo recupera o mesmo pedido; outro conteúdo ou usuário resulta em conflito/permissão negada.

Eventos `nft.updated` e `order.updated` são emitidos por Socket.IO client e carregam `id`, `resource` e `version`, além dos dados de atualização. O binding `@mswjs/socket.io-binding` simula o transporte sobre WebSocket interceptado pelo MSW. Não é um servidor Socket.IO de produção e seu handshake pode registrar erros de console no Lighthouse. O cliente ignora versões antigas/duplicadas, remove listeners ao encerrar o ciclo de sessão e invalida recursos REST após reconectar.

## Testes E2E

Playwright cobre busca, filtros, ordenação e paginação com histórico; deep links e NFT inexistente; login, cadastro, expiração e isolamento de sessão; favoritos com rollback e persistência; carrinho, cupom, refresh e migração do visitante; checkout confirmado/recusado, timeout idempotente e retomada após desconexão; perfil, senha e carteiras. Os fluxos e regressões visuais rodam em Chromium desktop, tablet e mobile. Os testes ficam em `e2e/marketplace.spec.ts` e `e2e/visual.spec.ts`.

## Auditoria Lighthouse

`npm run audit:lighthouse` constrói a aplicação, ativa os mocks padrão, audita Início e Detalhe em mobile (390 × 844) e desktop (1440 × 900), com três medições para cada combinação. As condições, versões, medianas e relatórios completos ficam em `reports/lighthouse/`; a configuração executável está em `scripts/lighthouse-audit.mjs`. Chromium instalado pelo Playwright é necessário. Para auditar uma origem já iniciada, use `LIGHTHOUSE_ORIGIN`.

As telas carregam imagens WebP geradas dos PNGs originais por `npm run assets:optimize`; o HTML prioriza a imagem hero do início, principal candidata a LCP mobile. A regressão visual cobre início, detalhe, carrinho e pagamento em viewports de 390, 768 e 1440 px.

## Publicação

O projeto inclui `vercel.json` com build `npm run build:mocks`, saída `dist` e fallback para rotas SPA. Importe o repositório na Vercel sem variáveis secretas; a versão de demonstração habilita MSW no build. A URL pública e o repositório remoto devem ser registrados nesta seção após a publicação.
