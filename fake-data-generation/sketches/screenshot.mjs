import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const dir = dirname(fileURLToPath(import.meta.url))
const html = pathToFileURL(join(dir, 'admin-simulations.html')).href
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(html, { waitUntil: 'load' })

const shots = [
  ['catalog', '01-catalog.png'],
  ['create', '02-create.png'],
  ['live', '03-live.png'],
  ['analysis', '04-analysis.png'],
]
for (const [name, file] of shots) {
  await page.evaluate((shown) => {
    for (const el of document.querySelectorAll('[data-screen]')) {
      el.style.display = el.getAttribute('data-screen') === shown ? '' : 'none'
    }
    window.scrollTo(0, 0)
  }, name)
  const el = page.locator(`[data-screen="${name}"]`)
  await el.screenshot({ path: join(dir, file) })
  console.log('wrote', file)
}
await browser.close()
