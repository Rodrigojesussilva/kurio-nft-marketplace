# Arquitetura e decisões

## Organização

- `src/main.tsx`: Router, shell, guards de sessão, cache Query e ciclo de conexão Socket.IO.
- `src/pages/`: telas de Início, Detalhes do NFT, Carrinho, Pagamento, Confirmação, Login, Cadastro, Perfil e Carteiras.
- `src/components/`: componentes compartilhados e componentes visuais no padrão shadcn/ui.
- `src/lib/api.ts`: tipos REST, cliente Axios, serialização e erros.
- `src/store.tsx`: sessão, carrinho e operações que coordenam REST e cache.
- `src/mocks/fixtures.ts`: fixtures de usuários e NFTs; `src/mocks/handlers.ts`: serviço simulado REST e eventos.
- `e2e/marketplace.spec.ts`: cenários Playwright.
- `scripts/lighthouse-audit.mjs`: execução reproduzível do Lighthouse.

## Contratos REST

Os contratos TypeScript e as chamadas Axios ficam em `src/lib/api.ts`; MSW os implementa na camada de rede em `src/mocks/handlers.ts`.

| Recurso | Operações |
| --- | --- |
| Sessão/conta | `POST /api/session/register`, `POST /api/session/login`, `GET /api/session`, `POST /api/session/logout`. |
| NFTs | `GET /api/nfts` (busca, filtros, ordenação e paginação), `GET /api/nfts/:id`. |
| Favoritos | `GET /api/favorites`, `POST /api/favorites/:id`, `DELETE /api/favorites/:id`. |
| Carrinho | `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:nftId/:editionId`, `DELETE /api/cart/items/:nftId/:editionId`. |
| Cotação | `POST /api/quote`, valida cupom, versões, preço, disponibilidade, taxas e total. |
| Pedidos | `POST /api/orders` (cabeçalho `Idempotency-Key`), `GET /api/orders/:id`. |
| Perfil | `GET/PATCH /api/profile`, `POST /api/profile/password`. |
| Carteiras | `GET/POST /api/wallets`, `PATCH/DELETE /api/wallets/:id`. |

Erros usam `{ error: { code, message, details? } }` com HTTP 4xx/5xx para validação, sessão expirada/inválida, falta de permissão, inexistência, conflito de estoque/cotação, timeout e falha transitória. ETH trafega como string decimal; cálculos monetários usam `bigint` em wei. A criação do pedido valida cotação/versões e associa a chave de idempotência ao usuário e ao fingerprint do payload: conteúdo idêntico recupera o mesmo pedido; chave reaproveitada para conteúdo diferente é conflito.

## Sessão, dados locais e carrinho

O token Bearer é fictício e fica no localStorage para reproduzir login e expiração. Cada operação autenticada resolve o usuário pelo token; dados de perfil, favoritos, carteiras, carrinho e pedidos são indexados pelo `userId`. Tokens expiram em uma hora (ou 30 segundos no cenário `short-session`). Isso demonstra isolamento no browser, sem pretensão de segurança de servidor real.

O visitante tem carrinho próprio. Login/cadastro combinam o carrinho visitante com o da conta e limitam quantidade à disponibilidade e ao máximo por pedido. O Query cache separa carrinho por usuário (`['cart', userId]`). As mutações REST atualizam/inválidam o cache; estado do pedido é lido por ID. Os dados mock persistem em localStorage para suportar refresh; `POST /api/scenario/reset` restaura integralmente os fixtures e remove estado de usuário/sessão/cenário.

## Query, REST e Socket.IO

TanStack Query usa chaves por recurso/usuário, fornece `AbortSignal` às requisições Axios e preserva filtros/página na URL para permitir reload e deep link. O shell conecta `socket.io-client` e inscreve o token em `session:subscribe`. `nft.updated` atualiza NFT em cache e invalida catálogo, carrinho e cotação; checkout rejeita versão/cotação antiga e exige revisão. `order.updated` atualiza apenas pedido pendente; confirmado e recusado são terminais. Versões estáveis permitem ignorar duplicatas e eventos atrasados. Na reconexão, o cliente reinscreve a sessão e invalida recursos ativos via REST. Listeners são removidos na troca de sessão/desmontagem.

A simulação Socket.IO é feita com `@mswjs/socket.io-binding` sobre WebSocket interceptado pelo MSW. É suficiente para desenvolvimento e E2E, mas não implementa servidor/protocolo operacional de produção; o handshake pode gerar aviso de console. Não há API, autenticação, banco, socket ou blockchain privados necessários no build de demonstração.

## Mocking e falhas reproduzíveis

`VITE_MOCKS=true` nos modos development/production inicia worker MSW no browser. Fixtures determinísticas incluem duas contas e catálogo variado. O cenário vem de `localStorage['kurio-scenario']`, com `?scenario=...` como alternativa. Login limpa o cenário para permitir autenticação; selecione cenário protegido depois de entrar. `POST /api/scenario/reset` restaura completamente estado, token e cenário.

Cenários suportados: `standard`, `slow`, `variable-latency`, `offline`, `network-timeout`, `http-500`, `empty`, `sold-out`, `expired-session`, `short-session`, `mutation-failure`, `price-changed`, `timeout-after-create`, `payment-rejected`, `payment-rejected-after-pending`, `rejected-order`, `socket-disconnect-once` e `socket-disconnect-pending-order`. Eles cobrem latência/ordem variável, conexão indisponível, timeout e erros HTTP, sessão, conflitos, cupom, mudança de preço/estoque, idempotência, recusa e reconciliação após desconexão.

## UX, Figma e limitações

As telas seguem a identidade escura, tipografia monoespaçada, detalhes cobre e referência responsiva recebida. O modal de acesso escurece a página; o desktop usa o Início como fundo não interativo, renderizando uma prévia do catálogo sem os hooks da rota inicial. As medições e assets estão descritos em `reports/lighthouse/audit-summary.md`. Desvios: autenticação social, recuperação de senha, movimentação real de carteira, pagamentos e links de transação são apenas demonstração; não há assinatura de blockchain. O binding Socket.IO é simulação local. Ativos, usuário e persistência ficam no navegador, portanto não existe proteção de dados entre dispositivos/servidores.

## Execução e verificação

- `npm ci`: instala versões travadas por `package-lock.json`.
- `npm run dev:mocks`: desenvolvimento com MSW.
- `npm run build:mocks`: typecheck e build de demonstração.
- `npm run preview`: serve `dist`.
- `npm run typecheck`, `npm run lint`, `npm run test:e2e` e `npm run audit:lighthouse`: verificações de tipos, lint, E2E e auditoria.

E2E usa Playwright Chromium desktop/mobile e cobre catálogo, falhas de login, compra, perfil, carteiras, isolamento entre contas, reconexão e falha/recuperação de pedidos. O Lighthouse executa três vezes por Início/Detalhe e mobile/desktop. A execução de referência em `reports/lighthouse/summary.json` foi gerada em 2026-10-21 UTC: Início mobile 87/100/96/92; Início desktop 97/100/96/92; detalhe mobile 90/100/96/92; detalhe desktop 99/100/96/92 (Performance/Acessibilidade/Boas práticas/SEO). Performance do Início mobile permanece 3 pontos abaixo da meta. Consulte os relatórios HTML/JSON e o resumo para métricas LCP/CLS/TBT e condições de execução.

## Publicação

`vercel.json` configura `npm ci`, build de demonstração, saída `dist` e fallback das rotas SPA. MSW e `public/mockServiceWorker.js` são parte do deploy. Repositório remoto e URL pública devem ser preenchidos após conectar/publicar o projeto; não há URL de deploy registrada neste checkout.
