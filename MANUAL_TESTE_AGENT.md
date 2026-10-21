# Manual de validação do marketplace Kurio

Este roteiro orienta um agente a validar manualmente as nove telas do desafio, seus fluxos entre telas e os estados de erro simulados. Os testes usam MSW; nenhuma compra movimenta dinheiro ou ativos reais.

## 1. Preparação

1. Instale as dependências com `npm install` se necessário.
2. Inicie a aplicação com `npm run dev` e abra a URL mostrada pelo Vite.
3. O MSW é controlado por `VITE_MOCKS`. Os arquivos `.env.development` e `.env.production` deixam a simulação ativa para desenvolvimento e demonstração; defina `VITE_MOCKS=false` para validar a interface sem mocks. As requisições `/api/*` e o Socket.IO demonstrativo são atendidos no navegador.
4. Use Chrome/Chromium e DevTools. Antes de cada cenário isolado, restaure o banco simulado pelo Console:

   ```js
   await fetch('/api/scenario/reset', { method: 'POST' })
   location.reload()
   ```

5. Contas disponíveis:

   - `ana@kurio.test` / `kurio123` — possui uma carteira Ethereum principal.
   - `caio@kurio.test` / `kurio123` — começa sem carteiras.

6. Teste em viewports de **390 × 844**, **768 × 1024** e **1440 × 1000**. Verifique que não há rolagem horizontal nem conteúdo cortado. Use zoom de 200% em pelo menos uma tela.

### Cenários MSW

Para reproduzir falhas, defina no Console antes de abrir/recarregar a tela:

```js
localStorage.setItem('kurio-scenario', 'slow')
location.reload()
```

Troque `slow` pelo cenário desejado. Remova-o e recarregue para voltar ao padrão, ou use o reset completo acima.

O cenário ativo vem de `localStorage['kurio-scenario']` e, como alternativa, do parâmetro `?scenario=...`. O login de demonstração limpa intencionalmente o cenário antes de autenticar para evitar que uma falha de rede bloqueie o acesso; em fluxos autenticados, entre primeiro e defina o cenário depois. Os dados e contas ficam no `localStorage` deste navegador, não são compartilhados entre contextos do Playwright e podem ser reiniciados com o endpoint de reset.

| Cenário | Uso sugerido |
|---|---|
| `standard` | Fluxo normal e estado padrão. |
| `slow` | Skeletons e carregamento prolongado. |
| `variable-latency` | Respostas com latência variável. |
| `offline` | Falha de conexão. |
| `network-timeout` | Timeout de rede. |
| `http-500` | Falha do catálogo. |
| `empty` | Catálogo sem resultados. |
| `sold-out` | Edição do NFT `042` esgotada. |
| `expired-session` | Sessão inválida em páginas privadas. |
| `short-session` | Sessão curta; aguarde cerca de 30 segundos após login. |
| `socket-disconnect-once` | Fecha a primeira conexão WebSocket para validar a reconexão automática do cliente. |
| `socket-disconnect-pending-order` | Cria o pedido pendente, fecha o socket da sessão e demora cinco segundos para concluir; valide a reconexão e a confirmação do pedido sem novo POST de compra. |
| `mutation-failure` | Falha ao salvar favorito. |
| `price-changed` | Preço muda durante a cotação. |
| `timeout-after-create` | Timeout após criar pedido; repetir deve recuperar o mesmo pedido. |
| `payment-rejected` | Pagamento recusado antes da criação do pedido. |
| `payment-rejected-after-pending` | Pedido passa por pendente e depois é recusado. |
| `rejected-order` | Ao assinar o socket, emite um evento didático `demo-order` sem um pedido persistido; use `payment-rejected-after-pending` para verificar o fluxo de pedido da simulação. |

## 2. Casos por tela

### Início — `src/pages/Inicio.tsx`

- [ ] Destaques e catálogo aparecem; imagens têm texto alternativo adequado quando informativas.
- [ ] Abrir busca e localizar um NFT pelo nome. Confirmar que a URL reflete o termo.
- [ ] Combinar categoria, rede e intervalo de preço; confirmar que a paginação volta à primeira página.
- [ ] Ordenar por preço crescente, decrescente e avaliação; conferir a ordem dos resultados.
- [ ] Avançar página, atualizar o navegador e usar voltar/avançar; filtros e página devem acompanhar a URL.
- [ ] Abrir um cartão e confirmar a navegação para o detalhe correspondente.
- [ ] Com `empty`, conferir o estado vazio. Com `http-500` ou `offline`, conferir erro e opção de tentar novamente. Com `slow`, conferir skeleton sem salto grande de layout.

### Detalhes do NFT — `src/pages/DetalhesNFT.tsx`

- [ ] Abrir diretamente `/mercado/042` e conferir imagem, nome, preço, descrição e edições.
- [ ] Selecionar uma edição disponível, aumentar/diminuir quantidade e respeitar o limite.
- [ ] Com `sold-out`, confirmar que a edição esgotada não pode ser comprada.
- [ ] Adicionar ao carrinho; validar feedback e navegação/estado do carrinho.
- [ ] Sem login, tocar em favorito e confirmar encaminhamento ao login. Depois de entrar, favoritar, atualizar a página e confirmar persistência; desfavoritar também.
- [ ] Com `mutation-failure`, confirmar rollback do favorito e mensagem de erro.
- [ ] Abrir `/mercado/id-inexistente`; conferir estado de recurso não encontrado e retorno ao início.

### Carrinho de NFTs — `src/pages/Carrinho.tsx`

- [ ] Conferir itens e valores iniciais. Aumentar/diminuir quantidades e remover item; o resumo deve atualizar.
- [ ] Atualizar a página e confirmar persistência. Remover o último item e conferir estado vazio.
- [ ] Aplicar `KURIO10`; conferir desconto e total. Testar `INVALIDO` e `EXPIRED`; a interface deve mostrar erro sem aplicar desconto.
- [ ] Comparar subtotal, desconto, taxa de rede e total com os valores exibidos na resposta de cotação da aba Network.
- [ ] Adicionar item como visitante, entrar e conferir que o carrinho de visitante foi combinado à conta sem exceder disponibilidade.
- [ ] Com `slow`, conferir skeleton do carrinho/resumo; com `offline`, conferir recuperação após nova tentativa.

### Pagamento — `src/pages/Pagamento.tsx`

- [ ] Sem sessão, tentar abrir `/pagamento`; deve pedir login e retornar ao checkout após autenticar.
- [ ] Conferir os campos do layout: nome de exibição, usuário, rede, nome do perfil, endereço, carteira secundária/ENS, tipo de carteira, indicação, e-mail e nome ENS. Validar os campos obrigatórios e o formato do endereço.
- [ ] Editar nome/e-mail do colecionador e marcar “Usar outra carteira?”; informar um endereço válido e confirmar que o checkout usa esse endereço.
- [ ] Selecionar rede e carteira compatível. Criar carteira previamente se estiver usando a conta Caio, que inicia sem carteiras.
- [ ] Conferir itens, edição, quantidade, cupom, subtotal, desconto, taxa e total antes de confirmar.
- [ ] Sem carteira na rede escolhida, confirmar que o pedido não é enviado e que há caminho para gerenciar carteiras.
- [ ] Com `price-changed`, conferir aviso de cotação atualizada e exigir nova revisão/confirmação antes de criar pedido.
- [ ] Com `payment-rejected`, conferir erro, permanência dos itens no carrinho e possibilidade de tentar novamente.
- [ ] Com `timeout-after-create`, repetir a ação e conferir recuperação do mesmo pedido sem duplicidade.

### Confirmação do pedido — `src/pages/Confirmacao.tsx`

- [ ] Depois de uma compra aceita, conferir estado, identificador da transação, carteira, itens, quantidades, taxas e total.
- [ ] Atualizar a página e confirmar que o recibo continua disponível e mantém os valores do snapshot do pedido.
- [ ] Conferir que o carrinho remove somente os itens/quantidades comprados.
- [ ] Com `payment-rejected-after-pending`, conferir estados pendente e recusado, sem exibir confirmação de sucesso.
- [ ] Confirmar que o link de transação é apresentado como referência simulada e abre em nova aba.

### Login — `src/pages/Login.tsx`

- [ ] Entrar com cada conta de demonstração e conferir retorno ao fluxo anterior quando veio do checkout/perfil/carteiras.
- [ ] Usar senha incorreta e conferir mensagem de erro sem criar sessão.
- [ ] Abrir rota privada sem autenticação e confirmar redirecionamento para login com destino de retorno preservado.
- [ ] Com `expired-session`, conferir encerramento da sessão e solicitação de novo login. Com `short-session`, aguardar expiração.
- [ ] Fazer logout; conferir redirecionamento/estado público e que dados privados não permanecem visíveis.
- [ ] No teclado, verificar foco inicial, ordem de Tab, contenção do foco e fechamento pelo Escape.

### Cadastro — `src/pages/Cadastro.tsx`

- [ ] Enviar formulário incompleto, e-mail inválido, senha menor que 8 caracteres e confirmação divergente; conferir validação.
- [ ] Tentar cadastrar `ana@kurio.test`; conferir conflito sem autenticar nova conta.
- [ ] Cadastrar e-mail novo e nome válido; confirmar sessão, persistência após refresh e acesso ao perfil.
- [ ] Antes de cadastrar, adicionar NFT como visitante; depois do cadastro, confirmar que o carrinho foi preservado.
- [ ] Repetir o fluxo por teclado e conferir mensagens de erro acessíveis.

### Perfil do colecionador — `src/pages/Perfil.tsx`

- [ ] Abrir `/perfil` sem sessão e confirmar solicitação de login; autenticado, conferir dados existentes.
- [ ] Alterar nome e e-mail com dados válidos; atualizar a página e confirmar persistência.
- [ ] Selecionar avatar válido, conferir prévia e salvar. Testar arquivo maior que 2 MB e conferir rejeição.
- [ ] Alterar senha com senha atual incorreta; conferir erro. Depois alterar com senha atual correta e confirmar que a nova senha permite login.
- [ ] Conferir validação de campos de senha vazios/incompletos e de confirmação divergente.
- [ ] Confirmar que o perfil só oferece dados, avatar, senha, carteiras e logout; não deve sugerir atividade, ofertas, downloads ou suporte como telas disponíveis.

### Carteiras — `src/pages/Carteiras.tsx`

- [ ] Abrir `/carteiras` sem sessão e confirmar solicitação de login.
- [ ] Na conta Ana, editar a carteira existente e salvar; atualizar e confirmar persistência.
- [ ] Criar carteira secundária válida em Ethereum/Polygon/Solana; conferir validação de nome, rede e endereço.
- [ ] Definir a carteira secundária como principal; conferir que só uma fica principal.
- [ ] Remover carteira secundária e confirmar atualização. Se remover a principal com outra carteira cadastrada, conferir que a carteira restante passa a principal; se for a única, conferir estado sem carteiras.
- [ ] Selecionar cada rede no checkout e confirmar que apenas carteiras compatíveis aparecem.

## 3. Fluxos integrados obrigatórios

- [ ] **Compra padrão:** início → detalhe → carrinho → login/cadastro, se necessário → pagamento → confirmação.
- [ ] **Recuperação de compra:** manter carrinho após falha/recusa, voltar ao checkout e tentar novamente.
- [ ] **Preço concorrente:** deixar NFT no carrinho, acionar `price-changed` antes de cotar e verificar atualização via socket, cotação nova e bloqueio da confirmação com valor antigo.
- [ ] **Retomada:** iniciar pedido pendente, atualizar a página ou interromper/reestabelecer conexão e conferir recuperação do mesmo pedido.
- [ ] **Isolamento:** autenticar Ana, conferir favorito/carteiras/pedidos; sair, autenticar Caio e verificar que os dados privados da Ana não aparecem.
- [ ] **Responsividade:** repetir os fluxos principais em 390, 768 e 1440 px. Conferir cabeçalhos, navegação, formulários, cartões, botões fixos e ausência de conteúdo escondido pelo menu inferior.
- [ ] **Acessibilidade básica:** navegar sem mouse; foco sempre visível; labels associados; mensagens de erro/status anunciadas; botões operáveis; contraste e zoom sem perda de conteúdo.

## 4. Registro da execução

Para cada caso, registre `PASSOU`, `FALHOU` ou `BLOQUEADO`, viewport, cenário, passos, resultado esperado/observado e evidência (captura de tela, console ou Network). Em falha, faça reset do MSW, repita uma vez no cenário padrão e anexe os passos mínimos para reproduzir.

| Data/hora | Caso | Viewport/cenário | Resultado | Evidência/observações |
|---|---|---|---|---|
| | | | | |

## 5. Verificações automatizadas complementares

Este manual é uma lista de execução exploratória. Para checagem adicional:

```bash
npm run typecheck
npm run test:e2e
npm run build
npm run audit:lighthouse
```

Playwright está configurado para Chromium desktop e mobile. A suíte cobre catálogo, validação de login, cadastro, edição de perfil e senha, isolamento de carteiras entre contas, reconexão de socket, compra aprovada e pedido recusado. Os testes reiniciam com contexto de navegador isolado. Lighthouse constrói a aplicação, serve o `dist` com Vite Preview e audita início/detalhe em mobile/desktop três vezes; grava relatórios e medianas em `reports/lighthouse/`. Defina `LIGHTHOUSE_ORIGIN` apenas para auditar outra origem já iniciada. O E2E não substitui a execução exploratória deste manual nem a inspeção visual nos viewports pedidos pelo desafio.
