// Local production measurements only. Never point this script at a live host.
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const origin = process.env.AUDIT_ORIGIN || 'http://127.0.0.1:3100'
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname)) throw new Error('Localhost only')
const label = process.argv[2] || 'current'
const out = 'audit-artifacts'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true })
const results = []
for (const device of ['desktop', 'mobile']) {
  for (const route of ['/', '/tools/tap-hold-maker', '/terms']) {
    for (let run = 1; run <= 3; run++) {
      const context = await browser.newContext({ viewport: device === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: device === 'mobile', deviceScaleFactor: 1, reducedMotion: 'reduce' })
      // Keep measurements repeatable and avoid third-party analytics. Clerk
      // and checkout integration checks are explicitly outside this harness.
      await context.route('**/*', request => new URL(request.request().url()).origin === origin ? request.continue() : request.abort())
      const page = await context.newPage()
      const errors = [], failed = [], consoleErrors = []
      page.on('pageerror', e => errors.push(e.message))
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text().replace(/(https?:\/\/[^\s?]+)\?[^\s]+/g, '$1?[redacted]')) })
      page.on('requestfailed', r => failed.push({ url: new URL(r.url()).origin + new URL(r.url()).pathname, reason: r.failure()?.errorText }))
      const cdp = await context.newCDPSession(page)
      await cdp.send('Network.enable')
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
      if (device === 'mobile') {
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 })
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
      }
      await page.addInitScript(() => {
        window.__audit = { lcp: 0, cls: 0 }
        new PerformanceObserver(list => { for (const e of list.getEntries()) window.__audit.lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
        new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__audit.cls += e.value }).observe({ type: 'layout-shift', buffered: true })
      })
      try {
        const response = await page.goto(origin + route, { waitUntil: 'load', timeout: 60000 })
        // Fixed measurement window, not an interaction assertion.
        await page.waitForTimeout(3000)
        const metrics = await page.evaluate(() => {
          const n = performance.getEntriesByType('navigation')[0]
          const resources = performance.getEntriesByType('resource')
          return { ...window.__audit, ttfb: n.responseStart, domContentLoaded: n.domContentLoadedEventEnd, jsBytes: resources.filter(r => r.name.includes('.js')).reduce((sum, r) => sum + r.encodedBodySize, 0), overflow: document.documentElement.scrollWidth > innerWidth, heading: document.querySelector('h1')?.textContent, headingOpacity: document.querySelector('h1') ? getComputedStyle(document.querySelector('h1').parentElement).opacity : null }
        })
        results.push({ device, route, run, status: response?.status(), ...metrics, errors, failed, consoleErrors })
        if (run === 1) await page.screenshot({ path: `${out}/${label}-${device}-${route === '/' ? 'home' : route.split('/').pop()}.png`, fullPage: false })
      } catch (e) { results.push({ device, route, run, error: e.message, errors, failed, consoleErrors }) }
      await context.close()
      // Persist completed samples even if a later browser run is interrupted.
      await writeFile(`${out}/${label}-browser.json`, JSON.stringify({ origin, browser: 'Chromium', completed: false, results }, null, 2))
    }
  }
}
await browser.close()
await writeFile(`${out}/${label}-browser.json`, JSON.stringify({ origin, browser: browser.version(), node: process.version, measuredAt: new Date().toISOString(), completed: true, conditions: 'Cold cache; desktop unthrottled; mobile 390x844, 4x CPU, 150ms RTT, 1.6Mbps down/750kbps up; third-party traffic blocked; 3s post-load observation; reduced motion', results }, null, 2))
console.log(JSON.stringify(results.map(({device, route, run, status, lcp, cls, jsBytes, error, headingOpacity}) => ({device, route, run, status, lcp, cls, jsBytes, error, headingOpacity})), null, 2))
