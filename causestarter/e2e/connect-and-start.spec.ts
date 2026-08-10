import { expect, test, type Page } from '@playwright/test'

/**
 * Smoke: open CauseStarter → connect Hardhat #0 → land on Start a cause.
 * Requires a running SPA (Docker :8090 with hash routing, or vite dev).
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

test.describe('CauseStarter agent smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Clear prior wallet / draft state from previous runs in this browser profile.
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

  test('connects Hardhat #0 and opens Start a cause', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /CauseStarter|Start a cause|Found/i }).first()).toBeVisible({
      timeout: 20_000,
    })

    // Home may say "Start a cause" as CTA; brand is in the app bar.
    await expect(page.getByTestId('wallet-connect-button')).toBeVisible()
    await connectHardhat0(page)

    await page.getByTestId('home-start-cause').click()
    await expect(page.getByTestId('start-cause-page')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Start a cause' })).toBeVisible()

    // Still connected after navigation.
    await expect(page.getByTestId('wallet-connect-button')).toContainText(/Hardhat #0/i)

    // Type a rough cause description so the plank-first path reaches the atomizer.
    const goal = page.getByTestId('start-cause-goal')
    await goal.fill(
      'Make Oak Street sidewalks safe and well lit within one year through neighbors and the city.',
    )
    await expect(goal).toHaveValue(/Oak Street/)
  })

  test('nav Start link opens the wizard while connected', async ({ page }) => {
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
