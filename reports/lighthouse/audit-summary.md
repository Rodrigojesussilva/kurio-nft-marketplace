# Auditoria Lighthouse

Executada em **2026-10-21 02:30 UTC** por `npm run audit:lighthouse`. O comando gera build de produção, inicia o preview com MSW no cenário padrão e executa três medições por rota e perfil. As medianas abaixo são calculadas pelo script e os resultados individuais estão em `summary.json` e nos arquivos de cada execução.

## Medianas

| Página / perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início / mobile | 87 | 100 | 96 | 92 | 3.451 s | 0.000 | 86 ms |
| Início / desktop | 97 | 100 | 96 | 92 | 1.137 s | 0.000 | 0 ms |
| Detalhe do NFT / mobile | 90 | 100 | 96 | 92 | 3.210 s | 0.000 | 27 ms |
| Detalhe do NFT / desktop | 99 | 100 | 96 | 92 | 0.907 s | 0.004 | 0 ms |

As metas de acessibilidade (95), boas práticas (95) e SEO (90) foram atingidas em todos os alvos. Performance atingiu a meta no desktop e no detalhe mobile; Início mobile ficou 3 pontos abaixo. O CLS do detalhe desktop caiu de 0.188 para 0.004 após reservar espaço para o conteúdo enquanto os dados carregam.

## Diagnósticos

- **Início mobile (87):** LCP mediano 3.451 s. A imagem principal é carregada depois que o React inicializa, então a descoberta da imagem e o carregamento inicial da aplicação são os principais pontos para melhorar. A auditoria estima JavaScript não utilizado e CSS que bloqueia a renderização; o bundle de entrada inclui a aplicação e MSW para manter os mocks ativos no build de demonstração.
- **Detalhe desktop:** três notas de performance: 99, 99 e 54. A nota 54 é uma execução isolada com TBT de 1.687 ms; a mediana continua 99, com TBT mediano 0 ms. Repetir a auditoria em máquina sem concorrência ajuda a avaliar a variabilidade.
- **Acessibilidade:** os ajustes de contraste, landmarks, ordem de títulos, grupos com rótulo e nome acessível do carrinho elevaram as quatro medianas para 100.
- **Best Practices (96):** persistem erros no console pelo handshake WebSocket do `socket.io-client` que recebe HTTP 200 no binding MSW. A nota permanece acima da meta.
- **SEO (92):** `/robots.txt` ainda recebe o fallback HTML da SPA, que Lighthouse interpreta como arquivo robots inválido. A pontuação permanece acima da meta.

## Alterações aplicadas

- Priorização e carregamento eager das imagens principais de Início e Detalhe.
- Semântica de `main`, grupos de conteúdo e hierarquia dos títulos corrigida.
- Contraste das contagens de categorias aumentado e rótulo acessível do carrinho sincronizado com o total visível.
- Skeleton do detalhe desktop reserva a altura do conteúdo final, evitando deslocamento do rodapé durante a consulta.

## Ambiente e condições

- Windows 10.0.26300 x64; Intel Core i7-1165G7 @ 2.80 GHz; 8 CPUs lógicas; 7.79 GiB de memória disponível.
- Node.js 22.23.1; Lighthouse 13.5.0; Playwright 1.64.1; Chromium 156.0.8078.4; Vite 8.3.4.
- Build otimizado (`npm run build`), MSW habilitado no cenário padrão, perfil isolado e sem overrides.
- Viewports: mobile 390 × 844 e desktop 1440 × 900, DPR 1. Lighthouse simula Slow 4G mobile (150 ms RTT, 1.6 Mbps, CPU 4×) e Dense 4G desktop (40 ms RTT, 10 Mbps, CPU 1×). A emulação efetiva fica registrada em cada JSON.

## Arquivos

- `summary.json`: ambiente, versões, configurações, notas e métricas individuais e medianas.
- `home-mobile-run-{1,2,3}.{html,json}` e equivalentes para `home-desktop`, `detail-mobile` e `detail-desktop`: relatórios originais.
- `../../scripts/lighthouse-audit.mjs`: configuração versionada da auditoria.
