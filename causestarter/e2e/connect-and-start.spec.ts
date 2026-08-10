import { expect, test, type Page } from '@playwright/test'

/**
 * Smoke: open CauseStarter → connect Hardhat #0 → start a cause → write and
 * publish an issue on the cause page itself.
 *
 * There is no launch wizard: a cause is a set of planks edited in place, and
 * each is published on its own. Requires a running SPA (Docker :8090 with hash
 * routing, or vite dev) plus the local chain and cause-assist.
 */

function appPath(path: string): string {
  // Docker / IPFS builds use HashRouter (VITE_HASH_ROUTING=true).
  const hashMode = process.env.CAUSESTARTER_HASH_ROUTING !== '0'
  if (!hashMode) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `/#${normalized === '/' ? '/' : normalized}`
}

async function connectHardhat0(page: Page) {
  await page.getByTestId('wallet-connect-button').click()
  await expect(page.getByTestId('wallet-account-menu')).toBeVisible()
  await page.getByTestId('wallet-hardhat-0').click()
  await expect(page.getByTestId('wallet-connect-button')).toContainText(/Hardhat #0/i, {
    timeout: 15_000,
  })
}

async function startCause(page: Page, description: string) {
  await page.getByTestId('home-start-cause').click()
  await expect(page.getByTestId('start-cause-page')).toBeVisible({ timeout: 10_000 })
  await page.getByTestId('start-cause-goal').fill(description)
  await page.getByTestId('start-cause-continue').click()
  await expect(page.getByTestId('cause-detail-page')).toBeVisible({ timeout: 10_000 })
}

test.describe('CauseStarter agent smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Clear prior wallet / cause state from previous runs in this browser profile.
    await page.goto(appPath('/'))
    await page.evaluate(() => {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {
        // ignore
      }
    })
    await page.goto(appPath('/'))
  })

  test('starts a cause and lands on its editable page', async ({ page }) => {
    await expect(page.getByTestId('wallet-connect-button')).toBeVisible()
    await connectHardhat0(page)
    await startCause(page, 'Make Oak Street sidewalks safe and well lit within one year.')

    // Still connected after navigation.
    await expect(page.getByTestId('wallet-connect-button')).toContainText(/Hardhat #0/i)

    // A brand-new cause has no planks, so no counts and nothing to select.
    await expect(page.getByTestId('cause-view-strip')).toBeHidden()
    await expect(page.getByTestId('cause-add-plank')).toBeVisible()
  })

  test('edits issues in place on the cause page', async ({ page }) => {
    await connectHardhat0(page)
    await startCause(page, 'Neighbors organizing for safer night walks on Oak Street.')

    await page.getByTestId('cause-add-plank').click()
    const first = page.getByTestId('plank-text-0')
    await first.fill('Oak Street gets working streetlights on every block by June.')

    // Edits persist without a save step — reloading the page keeps them.
    await page.reload()
    await expect(page.getByTestId('plank-text-0')).toHaveValue(/working streetlights/)

    // A second issue is added alongside, not nested under the first.
    await page.getByTestId('cause-add-plank').click()
    await page.getByTestId('plank-text-1').fill('Crosswalks near the school are repainted before winter.')
    await expect(page.getByTestId('plank-row-draft')).toHaveCount(2)
  })

  test('publishes one issue and counts it in the views strip', async ({ page }) => {
    await connectHardhat0(page)
    await startCause(page, 'Neighbors organizing for safer night walks on Oak Street.')

    await page.getByTestId('cause-add-plank').click()
    await page.getByTestId('plank-text-0').fill('Oak Street gets working streetlights on every block by June.')

    // Publishing runs the safety check, then writes the statement on chain.
    await page.getByTestId('plank-publish-0').click()
    await expect(page.getByTestId('plank-row-published')).toHaveCount(1, { timeout: 60_000 })

    // One published plank means there is now a view to count over.
    await expect(page.getByTestId('cause-view-strip')).toBeVisible()
    await expect(page.getByTestId('view-count-any')).toBeVisible({ timeout: 30_000 })

    // The conjunction view reports two bands, never a bare intersection.
    await page.getByTestId('view-mode-all').click()
    await expect(page.getByTestId('view-count-all')).toBeVisible()
    await expect(page.getByTestId('view-count-none-disagreed')).toBeVisible()
  })

  test('nav Start link opens the start page while connected', async ({ page }) => {
    await connectHardhat0(page)

    // Desktop nav (viewport is Desktop Chrome in playwright.config).
    const navStart = page.getByTestId('nav-start')
    if (await navStart.isVisible().catch(() => false)) {
      await navStart.click()
    } else {
      await page.goto(appPath('/start'))
    }

    await expect(page.getByTestId('start-cause-page')).toBeVisible()
    await expect(page.getByTestId('wallet-connect-button')).toContainText(/Hardhat #0/i)
  })
})
