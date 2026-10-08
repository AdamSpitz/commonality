import { test, expect, type Page } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/tmp/causestarter-seed-out'
mkdirSync(OUT, { recursive: true })

function appPath(path: string): string {
  const hashMode = process.env.CAUSESTARTER_HASH_ROUTING !== '0'
  if (!hashMode) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `/#${normalized === '/' ? '/' : normalized}`
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

function extractCauseId(url: string): string | null {
  const hash = url.includes('#') ? url.split('#')[1] : url
  const match = hash.match(/\/cause\/([0-9a-f-]{36})/i)
  return match ? match[1] : null
}

async function persistTitleSummary(page: Page, causeId: string, title: string, summary: string) {
  const result = await page.evaluate(({ causeId, title, summary }) => {
    const key = 'causestarter.causes.v3'
    const raw = localStorage.getItem(key)
    const list = raw ? JSON.parse(raw) : []
    const idx = list.findIndex((c: { id: string }) => c.id === causeId)
    if (idx < 0) {
      return { ok: false, error: 'cause not in localStorage', ids: list.map((c: { id: string }) => c.id), count: list.length }
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
}

test.describe('seed five civic draft causes', () => {
  test.setTimeout(180_000)

  test('creates 5 draft causes with 3 planks each via the live UI', async ({ page }) => {
    const created: Array<{
      title: string
      summary: string
      causeId: string
      url: string
      localUrl: string
      planks: string[]
    }> = []

    await page.goto(appPath('/'))
    await expect(page.getByTestId('wallet-connect-button')).toBeVisible({ timeout: 15_000 })

    for (const spec of CAUSES) {
      await page.goto(appPath('/start'))
      await expect(page.getByTestId('cause-detail-page')).toBeVisible({ timeout: 15_000 })

      await page.getByTestId('roster-title').fill(spec.title)
      await page.getByTestId('roster-summary').fill(spec.summary)

      for (let i = 0; i < spec.planks.length; i++) {
        await page.getByTestId('cause-add-plank').click()
        await page.getByTestId(`plank-text-${i}`).fill(spec.planks[i])
      }

      await expect(page.getByTestId('plank-row-draft')).toHaveCount(3)

      const url = page.url()
      const causeId = extractCauseId(url)
      expect(causeId).toBeTruthy()
      await persistTitleSummary(page, causeId!, spec.title, spec.summary)

      created.push({
        title: spec.title,
        summary: spec.summary,
        causeId: causeId!,
        url,
        localUrl: `http://127.0.0.1:8090/#/cause/${causeId}`,
        planks: spec.planks,
      })
    }

    const verifications = []
    for (const c of created) {
      await page.goto(appPath(`/cause/${c.causeId}`))
      await expect(page.getByTestId('cause-detail-page')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByRole('heading', { name: c.title })).toBeVisible()
      await expect(page.getByTestId('roster-title')).toHaveValue(c.title)
      await expect(page.getByTestId('roster-summary')).toHaveValue(c.summary)
      await expect(page.getByTestId('plank-row-draft')).toHaveCount(3)
      const plankTexts = []
      for (let i = 0; i < 3; i++) {
        const val = await page.getByTestId(`plank-text-${i}`).inputValue()
        plankTexts.push(val)
        expect(val).toBe(c.planks[i])
      }
      const shot = join(OUT, `cause-verify-${c.causeId}.png`)
      await page.screenshot({ path: shot, fullPage: true })
      verifications.push({ causeId: c.causeId, title: c.title, plankTexts, screenshot: shot, reachable: true })
    }

    await page.goto(appPath('/momentum'))
    await expect(page.getByRole('heading', { name: 'Momentum' })).toBeVisible({ timeout: 15_000 })
    const bodyText = await page.locator('body').innerText()
    const momentumFound = created.map((c) => ({ title: c.title, visible: bodyText.includes(c.title) }))
    for (const c of created) {
      expect(bodyText).toContain(c.title)
    }
    await expect(page.getByRole('heading', { name: 'Drafts' })).toBeVisible()
    const momentumShot = join(OUT, 'momentum.png')
    await page.screenshot({ path: momentumShot, fullPage: true })

    const storage = await page.evaluate(() => {
      const raw = localStorage.getItem('causestarter.causes.v3')
      return raw ? JSON.parse(raw) : []
    })

    const report = {
      appUp: true,
      method: 'Playwright real UI via e2e harness (Start → roster title/summary → Write one manually × 3). Title/summary patched into causestarter.causes.v3 after UI fill because those fields persist only on roster publish.',
      created,
      verifications,
      momentum: { found: momentumFound, screenshot: momentumShot, draftsHeading: true },
      walletWall: 'No wallet wall blocked draft creation. Connect-wallet copy may appear for publishing; did not publish on-chain.',
      localStorageCount: storage.length,
      localStorageIds: storage.map((c: { id: string; title?: string; planks?: unknown[] }) => ({
        id: c.id,
        title: c.title,
        plankCount: c.planks?.length,
      })),
    }
    writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2))
  })
})
