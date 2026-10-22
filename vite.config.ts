import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type PluginOption } from 'vite'

export default defineConfig(({ mode, command }) => {
  const mocksEnabled = loadEnv(mode, process.cwd()).VITE_MOCKS === 'true'
  const plugins: PluginOption[] = [react()]

  if (command === 'build' && mocksEnabled) {
    plugins.push({
      name: 'preload-mock-runtime',
      transformIndexHtml: (html) => html.replace('</head>', '    <link rel="modulepreload" href="/assets/mocks.js" />\n  </head>'),
    })
  }

  return {
    plugins,
    build: {
      rolldownOptions: {
        output: {
          chunkFileNames: (chunk) => chunk.name === 'browser' ? 'assets/mocks.js' : 'assets/[name]-[hash].js',
        },
      },
    },
  }
})
