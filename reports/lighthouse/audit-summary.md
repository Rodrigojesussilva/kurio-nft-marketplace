# Auditoria Lighthouse

Executada em **2026-10-22 14:07 UTC** com `npm run audit:lighthouse`. O comando gera o build de produção e executa três medições por rota e perfil. As medianas vêm de `summary.json`; os relatórios individuais ficam nesta pasta.

## Medianas

| Página / perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início / mobile | 90 | 100 | 96 | 100 | 3.081 s | 0.000 | 61 ms |
| Início / desktop | 100 | 100 | 96 | 100 | 0.598 s | 0.000 | 0 ms |
| Detalhe do NFT / mobile | 90 | 100 | 96 | 100 | 3.091 s | 0.000 | 58 ms |
| Detalhe do NFT / desktop | 100 | 100 | 96 | 100 | 0.650 s | 0.004 | 0 ms |

As metas de performance (90), acessibilidade (95), boas práticas (95) e SEO (90) foram atingidas nas medianas. Início mobile melhorou de 87 para 90. As notas individuais podem variar um ponto entre execuções.

## Diagnósticos e correções

- Imagens de catálogo convertidas para WebP e rotas secundárias divididas em chunks carregados sob demanda.
- A imagem principal do início agora recebe prioridade alta e preload; removemos preloads concorrentes de imagens abaixo da dobra.
- `public/robots.txt` serve uma política válida para crawlers, elevando SEO de 92 para 100.
- Acessibilidade ficou em 100 em todos os alvos; CLS permaneceu em 0, exceto detalhe desktop (0.004).
- Best Practices ficou em 96. O binding Socket.IO simulado pelo MSW registra erros no handshake WebSocket durante auditoria Lighthouse; esse comportamento pertence ao ambiente de demonstração.

## Ambiente e condições

- Windows x64; Node.js 22.23.1; Lighthouse 13.5.0; Playwright 1.64.1; Chromium 156.0.8078.4; Vite 8.3.4.
- Build Vite de produção com MSW ativo, cenário padrão e perfil Chromium isolado.
- Viewports: mobile 390 × 844 e desktop 1440 × 900. Lighthouse simula Slow 4G no mobile e Dense 4G no desktop; configurações detalhadas estão em `summary.json`.
- Três execuções para cada combinação de página e perfil.

## Arquivos

- `summary.json`: ambiente, versões, condições, notas e métricas individuais e medianas.
- `home-mobile-run-{1,2,3}.{html,json}` e equivalentes para `home-desktop`, `detail-mobile` e `detail-desktop`.
- `../../scripts/lighthouse-audit.mjs`: configuração versionada da auditoria.
