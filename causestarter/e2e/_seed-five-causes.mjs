#!/usr/bin/env node
import { chromium } from '/Users/ssadams/Desktop/commonality stuff/commonality/node_modules/playwright/index.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = 'http://127.0.0.1:8090'
const OUT = '/tmp/causestarter-seed-out'
mkdirSync(OUT, { recursive: true })

function appUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${BASE}/#${normalized === '/' ? '/' : normalized}`
}

const CAUSES = [
  {
    title: 'Extend Riverside Branch Library Hours',
    summary: 'Working families need evening and weekend access to the Riverside Branch so the library is usable after the school day and on Sundays.',
    planks: [
      'The Riverside Branch Library should stay open until 8pm on weekdays.',
      'The Riverside Branch Library should be open on Sundays from noon to 5pm.',
      'The city should restore Saturday morning hours at the Riverside Branch Library.',
    ],
  },
  {
    title: 'Protected Bike Lanes on Maple Avenue',
    summary: 'Residents want a continuous protected bike lane on Maple Avenue so people can ride to school and work without mixing with fast car traffic.',
    planks: [
      'Maple Avenue should have a protected bike lane from the river to City Hall.',
      'Bike lane barriers on Maple Avenue should be in place before the next school year.',
      'The city should add a signalized bike crossing at Maple Avenue and 4th Street.',
    ],
  },
  {
    title: 'Neighborhood Compost Drop-Off',
    summary: 'A weekly food-scraps drop-off would keep waste out of the landfill and give neighbors a simple way to compost without a backyard bin.',
    planks: [
      'The city should open a weekly food-scraps drop-off at the community garden.',
      'Apartment buildings on Oak Street should get shared compost bins by this fall.',
      'The sanitation department should collect food scraps from the drop-off every Tuesday.',
    ],
  },
  {
    title: 'After-School Programs at Lincoln Rec Center',
    summary: 'Families need affordable after-school care at Lincoln Rec Center so kids have a safe place to go until parents get off work.',
    planks: [
      'Lincoln Rec Center should offer after-school programs until 6pm on school days.',
      'After-school enrollment at Lincoln Rec Center should stay free for families who qualify for free lunch.',
      'The rec center should add a homework-help hour staffed four days a week.',
    ],
  },
  {
    title: 'Better Lighting in Cedar Park',
    summary: 'Evening walkers and families want working lights on the main paths so Cedar Park stays usable and feels safe after dark.',
    planks: [
      'Every main path in Cedar Park should have working lights by the end of the year.',
      'The city should replace the broken fixtures at the Cedar Park playground this quarter.',
      'Cedar Park parking lot lights should stay on until 10pm.',
    ],
  },
]

function extractCauseId(url) {
  const hash = url.includes('#') ? url.split('#')[1] : url
  const match = hash.match(/\/cause\/([0-9a-f-]{36})/i)
  return match ? match[1] : null
}

async function persistTitleSummary(page, causeId, title, summary) {
  const result = await page.evaluate(({ causeId, title, summary }) => {
    const key = 'causestarter.causes.v3'
    const raw = localStorage.getItem(key)
    const list = raw ? JSON.parse(raw) : []
    const idx = list.findIndex((c) => c.id === causeId)
    if (idx < 0) {
      return { ok: false, error: 'cause not in localStorage', ids: list.map((c) => c.id), count: list.length }
    }
    list[idx] = {
      ...list[idx],
      title,
      summary,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(key, JSON.stringify(list))
    return { ok: true, plankCount: list[idx].planks?.length ?? 0 }
  }, { causeId, title, summary })
  if (!result.ok) {
    throw new Error(`Failed to persist title/summary for ${causeId}: ${JSON.stringify(result)}`)
  }
  return result
}

async function createOne(page, spec, index) {
  await page.goto(appUrl('/start'), { waitUntil: 'domcontentloaded' })
  await page.getByTestId('cause-detail-page').waitFor({ timeout: 15_000 })

  const titleField = page.getByTestId('roster-title')
  await titleField.waitFor({ timeout: 10_000 })
  await titleField.fill(spec.title)
  await page.getByTestId('roster-summary').fill(spec.summary)

  for (let i = 0; i < spec.planks.length; i++) {
    await page.getByTestId('cause-add-plank').click()
    const field = page.getByTestId(`plank-text-${i}`)
    await field.waitFor({ timeout: 10_000 })
    await field.fill(spec.planks[i])
  }

  await page.getByTestId('plank-row-draft').nth(2).waitFor({ timeout: 10_000 })

  const url = page.url()
  const causeId = extractCauseId(url)
  if (!causeId) throw new Error(`Could not parse causeId from URL: ${url}`)

  await persistTitleSummary(page, causeId, spec.title, spec.summary)

  const shot = join(OUT, `cause-${index + 1}-created.png`)
  await page.screenshot({ path: shot, fullPage: true })

  return { ...spec, causeId, url, screenshot: shot }
}

async function verifyCause(page, created) {
  await page.goto(appUrl(`/cause/${created.causeId}`), { waitUntil: 'domcontentloaded' })
  await page.getByTestId('cause-detail-page').waitFor({ timeout: 15_000 })

  const heading = page.getByRole('heading', { name: created.title })
  const headingVisible = await heading.isVisible().catch(() => false)

  const titleValue = await page.getByTestId('roster-title').inputValue().catch(() => '')
  const summaryValue = await page.getByTestId('roster-summary').inputValue().catch(() => '')

  const draftCount = await page.getByTestId('plank-row-draft').count()
  const plankTexts = []
  for (let i = 0; i < 3; i++) {
    const val = await page.getByTestId(`plank-text-${i}`).inputValue().catch(() => null)
    plankTexts.push(val)
  }

  const stored = await page.evaluate((causeId) => {
    const raw = localStorage.getItem('causestarter.causes.v3')
    const list = raw ? JSON.parse(raw) : []
    return list.find((c) => c.id === causeId) || null
  }, created.causeId)

  const shot = join(OUT, `cause-verify-${created.causeId}.png`)
  await page.screenshot({ path: shot, fullPage: true })

  return {
    reachable: headingVisible || titleValue === created.title,
    headingVisible,
    titleValue,
    summaryValue,
    draftCount,
    plankTexts,
    storedTitle: stored?.title ?? null,
    storedSummary: stored?.summary ?? null,
    storedPlankTexts: (stored?.planks || []).map((p) => p.text),
    storedPlankOrigins: (stored?.planks || []).map((p) => p.origin),
    screenshot: shot,
  }
}

async function verifyMomentum(page, created) {
  await page.goto(appUrl('/momentum'), { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)

  const bodyText = await page.locator('body').innerText()
  const found = []
  for (const c of created) {
    found.push({
      title: c.title,
      visible: bodyText.includes(c.title),
    })
  }

  const draftsHeading = await page.getByRole('heading', { name: 'Drafts' }).isVisible().catch(() => false)
  const emptyAlert = await page.getByText('No causes yet').isVisible().catch(() => false)
  const walletAlert = await page.getByText(/connect.*wallet/i).isVisible().catch(() => false)

  const shot = join(OUT, 'momentum.png')
  await page.screenshot({ path: shot, fullPage: true })

  return {
    draftsHeading,
    emptyAlert,
    walletAlert,
    found,
    bodyExcerpt: bodyText.slice(0, 2000),
    screenshot: shot,
  }
}

async function main() {
  const report = {
    appUp: true,
    method: 'Playwright real UI (Start → roster title/summary → Write one manually × 3). Title/summary patched into causestarter.causes.v3 after UI fill because the UI only persists those fields on roster publish (wallet). Planks persist immediately via updateCause.',
    created: [],
    verifications: [],
    momentum: null,
    walletWall: null,
    error: null,
  }

  const browser = await chromium.launch({ headless: true, channel: 'chrome' })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  page.setDefaultTimeout(20_000)

  try {
    await page.goto(appUrl('/'), { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    const walletVisible = await page.getByTestId('wallet-connect-button').isVisible().catch(() => false)
    report.walletButtonVisibleOnHome = walletVisible

    for (let i = 0; i < CAUSES.length; i++) {
      const created = await createOne(page, CAUSES[i], i)
      report.created.push({
        title: created.title,
        summary: created.summary,
        causeId: created.causeId,
        url: created.url,
        localUrl: `${BASE}/#/cause/${created.causeId}`,
        planks: created.planks,
        screenshot: created.screenshot,
      })
    }

    for (const created of report.created) {
      const v = await verifyCause(page, created)
      report.verifications.push({ causeId: created.causeId, title: created.title, ...v })
    }

    report.momentum = await verifyMomentum(page, report.created)

    const storage = await page.evaluate(() => {
      const raw = localStorage.getItem('causestarter.causes.v3')
      return raw ? JSON.parse(raw) : []
    })
    report.localStorageCount = storage.length
    report.localStorageIds = storage.map((c) => ({ id: c.id, title: c.title, plankCount: c.planks?.length }))

    const anyWalletBlock = await page.getByText(/Connect your wallet to publish/i).isVisible().catch(() => false)
    report.walletWall = anyWalletBlock
      ? 'Info alert present: unpublished issues stay on device / connect wallet to publish. Did not block draft creation. Did not publish on-chain.'
      : 'No wallet wall blocked draft creation. Did not publish on-chain.'
  } catch (err) {
    report.error = `${err && err.message ? err.message : String(err)}\n${err && err.stack ? err.stack : ''}`
    try {
      await page.screenshot({ path: join(OUT, 'error.png'), fullPage: true })
      report.errorScreenshot = join(OUT, 'error.png')
    } catch {
      // ignore
    }
  } finally {
    writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2))
    await browser.close()
  }

  if (report.error) {
    console.error('FAILED')
    console.error(report.error)
    process.exitCode = 1
  } else {
    console.log('OK')
    console.log(JSON.stringify({
      created: report.created.map((c) => ({ title: c.title, causeId: c.causeId, url: c.localUrl })),
      momentum: report.momentum?.found,
      walletWall: report.walletWall,
    }, null, 2))
  }
}

await main()
