import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import os from 'node:os'
import { chromium } from 'playwright'
import lighthouse from 'lighthouse'

let origin = process.env.LIGHTHOUSE_ORIGIN?.replace(/\/$/, '')
const outputDirectory = 'reports/lighthouse'
const categories = ['performance', 'accessibility', 'best-practices', 'seo']
const runCount = 3
const viewports = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 1 },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
}
const targets = [
  { name: 'home-mobile', path: '/', formFactor: 'mobile' },
  { name: 'home-desktop', path: '/', formFactor: 'desktop' },
  { name: 'detail-mobile', path: '/mercado/042', formFactor: 'mobile' },
  { name: 'detail-desktop', path: '/mercado/042', formFactor: 'desktop' },
]

async function isAvailable(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) })
    return response.ok
  } catch {
    return false
  }
}

async function getFreePort() {
  const server = createServer()
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject))
  const { port } = server.address()
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  return port
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
const readPackageVersion = async (name) => JSON.parse(await readFile(new URL(`../node_modules/${name}/package.json`, import.meta.url), 'utf8')).version

let previewProcess
let browser
try {
  if (!origin) {
    await access('dist/index.html')
    const previewPort = await getFreePort()
    origin = `http://127.0.0.1:${previewPort}`
    previewProcess = spawn(process.execPath, ['./node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort'], { stdio: 'ignore' })
    previewProcess.once('error', (error) => { throw error })
    const deadline = Date.now() + 30_000
    while (Date.now() < deadline && !await isAvailable(origin)) {
      if (previewProcess.exitCode !== null) throw new Error(`Vite Preview encerrou antes de iniciar (código ${previewProcess.exitCode}).`)
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
    if (!await isAvailable(origin)) throw new Error(`A versão de produção não respondeu em ${origin} após 30 segundos.`)
  } else if (!await isAvailable(origin)) {
    throw new Error(`A origem Lighthouse configurada não respondeu em ${origin}.`)
  }

  await mkdir(outputDirectory, { recursive: true })
  const port = await getFreePort()
  browser = await chromium.launch({ headless: true, args: [`--remote-debugging-port=${port}`] })
  const buildInfo = await stat('dist/index.html')
  const report = {
    origin,
    generatedAt: new Date().toISOString(),
    versions: { node: process.version, lighthouse: await readPackageVersion('lighthouse'), playwright: await readPackageVersion('playwright'), chromium: browser.version(), vite: await readPackageVersion('vite') },
    environment: { platform: `${os.type()} ${os.release()}`, arch: os.arch(), cpu: os.cpus()[0]?.model ?? 'unknown', logicalCpus: os.cpus().length, totalMemoryBytes: os.totalmem(), buildArtifact: 'dist/index.html', buildGeneratedAt: buildInfo.mtime.toISOString() },
    conditions: { build: 'Vite production build (npm run build)', mocks: 'MSW enabled in production build; default scenario; fresh isolated Chromium profile; no scenario query/localStorage overrides', network: 'Lighthouse simulation presets: mobile Slow 4G (150 ms RTT, 1.6 Mbps, 4x CPU) and desktop Dense 4G (40 ms RTT, 10 Mbps, 1x CPU); exact settings in each JSON report', cache: 'Lighthouse default storage/cache clearing; fresh browser profile; repeated navigations share the audit browser process', repetitionsPerTarget: runCount, categories, viewports },
    runs: [], medians: {},
  }

  for (const target of targets) {
    const scores = Object.fromEntries(categories.map((category) => [category, []]))
    const metrics = { lcpMs: [], cls: [], tbtMs: [] }
    for (let run = 1; run <= runCount; run += 1) {
      const result = await lighthouse(`${origin}${target.path}`, {
        port,
        hostname: '127.0.0.1',
        output: ['html', 'json'],
        logLevel: 'error',
        onlyCategories: categories,
        formFactor: target.formFactor,
        throttlingMethod: 'simulate',
        throttling: target.formFactor === 'mobile'
          ? { rttMs: 150, throughputKbps: 1638.4, requestLatencyMs: 562.5, downloadThroughputKbps: 1474.56, uploadThroughputKbps: 675, cpuSlowdownMultiplier: 4 }
          : { rttMs: 40, throughputKbps: 10240, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0, cpuSlowdownMultiplier: 1 },
        emulatedUserAgent: true,
        screenEmulation: target.formFactor === 'mobile'
          ? { mobile: true, ...viewports.mobile, disabled: false }
          : { mobile: false, ...viewports.desktop, disabled: false },
      })
      if (!result) throw new Error(`Lighthouse não retornou resultado em ${target.name}, execução ${run}.`)
      const { lhr, report: outputs } = result
      const safeName = `${target.name}-run-${run}`
      await writeFile(`${outputDirectory}/${safeName}.html`, outputs[0])
      await writeFile(`${outputDirectory}/${safeName}.json`, outputs[1])
      const runScores = Object.fromEntries(categories.map((category) => {
        const score = Math.round((lhr.categories[category]?.score ?? 0) * 100)
        scores[category].push(score)
        return [category, score]
      }))
      const runMetrics = { lcpMs: lhr.audits['largest-contentful-paint']?.numericValue ?? null, cls: lhr.audits['cumulative-layout-shift']?.numericValue ?? null, tbtMs: lhr.audits['total-blocking-time']?.numericValue ?? null }
      for (const [metric, value] of Object.entries(runMetrics)) if (typeof value === 'number') metrics[metric].push(value)
      const diagnosticIds = ['largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time', 'render-blocking-insight', 'uses-responsive-images', 'uses-optimized-images', 'uses-text-compression', 'uses-long-cache-ttl', 'uses-rel-preload', 'font-display', 'image-delivery-insight', 'lcp-discovery-insight', 'third-party-summary', 'mainthread-work-breakdown', 'bootup-time', 'unused-javascript', 'uses-passive-event-listeners', 'aria-prohibited-attr', 'color-contrast', 'heading-order', 'landmark-one-main', 'label-content-name-mismatch', 'errors-in-console', 'robots-txt']
      const diagnostics = Object.fromEntries(diagnosticIds.flatMap((id) => {
        const audit = lhr.audits[id]
        if (!audit || audit.score === null || audit.score >= 1) return []
        const affected = (audit.details?.items ?? []).slice(0, 6).map((item) => ({ selector: item.node?.selector, snippet: item.node?.snippet, explanation: item.node?.explanation, message: item.description ?? item.message, url: item.url }))
        return [[id, { title: audit.title, score: audit.score, displayValue: audit.displayValue, description: audit.description, affected }]]
      }))
      report.runs.push({ target: target.name, path: target.path, formFactor: target.formFactor, run, scores: runScores, metrics: runMetrics, lighthouseSettings: lhr.configSettings, diagnostics })
      console.log(`${target.name} (${run}/3): performance ${runScores.performance}, acessibilidade ${runScores.accessibility}`)
    }
    report.medians[target.name] = { ...Object.fromEntries(categories.map((category) => [category, median(scores[category])])), metrics: Object.fromEntries(Object.entries(metrics).map(([metric, values]) => [metric, values.length ? median(values) : null])) }
  }

  await writeFile(`${outputDirectory}/summary.json`, JSON.stringify(report, null, 2))
  console.log(`Relatórios Lighthouse e medianas gravados em ${outputDirectory}.`)
} finally {
  await browser?.close()
  if (previewProcess && previewProcess.exitCode === null) previewProcess.kill()
}
