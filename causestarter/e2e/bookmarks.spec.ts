import { expect, test, type Page } from '@playwright/test'

function appPath(path: string): string {
  const hashMode = process.env.CAUSESTARTER_HASH_ROUTING !== '0'
  if (!hashMode) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `/#${normalized === '/' ? '/' : normalized}`
}

async function connectHardhat(page: Page, account: number) {
  const shellWallet = page.getByRole('banner').getByTestId('wallet-connect-button')
  await shellWallet.click()
  await expect(page.getByTestId('wallet-account-menu')).toBeVisible()
  await page.getByTestId(`wallet-hardhat-${account}`).click()
  await expect(shellWallet).toContainText(`Hardhat #${account}`, {
    timeout: 15_000,
  })
}

async function startCause(page: Page) {
  await page.getByTestId('nav-causes').click()
  await page.getByTestId('causes-start-cause').click()
  await expect(page.getByTestId('cause-detail-page')).toBeVisible({ timeout: 10_000 })
}

async function clearBrowserStorage(page: Page) {
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      // ignore
    }
  })
}

async function waitForWalletBookmarkWrite(page: Page) {
  // updateRef is fire-and-forget from the bookmark button; give the local
  // chain time to include it before we wipe the device cache.
  await page.waitForTimeout(20_000)
}

test.describe('Cause bookmarks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(appPath('/'))
    await clearBrowserStorage(page)
    await page.goto(appPath('/'))
  })

  test('keeps and removes a published cause, and hydrates after reconnect', async ({ page }) => {
    test.setTimeout(240_000)
    await connectHardhat(page, 0)
    await startCause(page)

    await page.getByTestId('cause-add-plank').click()
    await page.getByTestId('plank-text-0').fill(
      'Every Oak Street block has working streetlights by June.',
    )
    await page.getByTestId('plank-publish-0').click()
    await expect(page.getByTestId('plank-row-published')).toHaveCount(1, { timeout: 60_000 })

    const title = `Bookmarked Oak Street ${Date.now()}`
    const slug = `bookmarked-oak-${Date.now()}`
    await page.getByTestId('roster-title').fill(title)
    await page.getByTestId('roster-summary').fill('Neighbors organizing for working streetlights.')
    await page.getByTestId('roster-slug').fill(slug)
    await page.getByTestId('roster-publish-anyway').click()
    await expect(page).toHaveURL(new RegExp(`/cause/0x[0-9a-f]{40}/${slug}$`), {
      timeout: 60_000,
    })
    const stableUrl = page.url()

    await clearBrowserStorage(page)
    await page.goto(stableUrl)
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible({
      timeout: 30_000,
    })
    await connectHardhat(page, 1)

    await page.getByTestId('cause-keep-on-device').click()
    await expect(page.getByTestId('cause-remove-from-device')).toBeVisible({ timeout: 10_000 })
    await waitForWalletBookmarkWrite(page)

    await page.getByTestId('nav-causes').click()
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible({
      timeout: 30_000,
    })

    await clearBrowserStorage(page)
    await page.goto(appPath('/causes'))
    await connectHardhat(page, 1)
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible({
      timeout: 45_000,
    })

    await page.getByRole('heading', { name: title, exact: true }).click()
    await expect(page.getByTestId('cause-remove-from-device')).toBeVisible({ timeout: 30_000 })
    await page.getByTestId('cause-remove-from-device').click()
    await expect(page.getByTestId('cause-keep-on-device')).toBeVisible()
    await waitForWalletBookmarkWrite(page)

    await page.getByTestId('nav-causes').click()
    await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0)

    await clearBrowserStorage(page)
    await page.goto(appPath('/causes'))
    await connectHardhat(page, 1)
    await expect(page.getByRole('heading', { name: 'Causes', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0, {
      timeout: 45_000,
    })
  })
})
