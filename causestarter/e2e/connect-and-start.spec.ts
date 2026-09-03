import { expect, test, type Page } from '@playwright/test'

/**
 * Smoke: open CauseStarter → connect Hardhat #0 → start a cause → write and
 * publish an issue on the cause page itself.
 *
 * There is no launch wizard or intermediate start form: a cause is a set of
 * planks edited in place, and each is published on its own. Requires a running
 * SPA (Docker :8090 with hash routing, or vite dev) plus the local chain and
 * cause-assist.
 */

function appPath(path: string): string {
  // Docker / IPFS builds use HashRouter (VITE_HASH_ROUTING=true).
  const hashMode = process.env.CAUSESTARTER_HASH_ROUTING !== '0'
  if (!hashMode) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `/#${normalized === '/' ? '/' : normalized}`
}

async function connectHardhat0(page: Page) {
  await connectHardhat(page, 0)
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
  // Occupied home drops the landing CTA once this wallet already has causes.
  // Causes always exposes the same start control.
  await page.getByTestId('nav-causes').click()
  await page.getByTestId('causes-start-cause').click()
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

  test('occupied home shows the personal fundable-projects board after connect', async ({ page }) => {
    await connectHardhat0(page)
    await expect(page.getByTestId('home-dashboard-board')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /your fundable projects/i })).toBeVisible()
  })

  test('starts a cause and lands on its editable page', async ({ page }) => {
    await expect(page.getByTestId('wallet-connect-button')).toBeVisible()
    await expect(page.getByTestId('home-start-cause')).toBeVisible()
    await connectHardhat0(page)
    await startCause(page)

    // Still connected after navigation.
    await expect(page.getByTestId('wallet-connect-button')).toContainText(/Hardhat #0/i)

    // A brand-new cause has no planks, so no counts and nothing to select.
    await expect(page.getByTestId('cause-view-strip')).toBeHidden()
    await expect(page.getByTestId('cause-add-plank')).toBeVisible()
    await expect(page.getByRole('heading', { name: /start a cause board/i })).toBeVisible()
  })

  test('edits issues in place on the cause page', async ({ page }) => {
    await connectHardhat0(page)
    await startCause(page)

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
    await startCause(page)

    await page.getByTestId('cause-add-plank').click()
    await page.getByTestId('plank-text-0').fill('Oak Street gets working streetlights on every block by June.')

    // Publishing runs the safety check, then writes the statement on chain.
    await page.getByTestId('plank-publish-0').click()
    await expect(page.getByTestId('plank-row-published')).toHaveCount(1, { timeout: 60_000 })

    // One published plank means there is now a view to count over.
    await expect(page.getByTestId('cause-view-strip')).toBeVisible()
    await expect(page.getByTestId('view-count-any')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('view-count-all')).toBeVisible()
  })

  test('Cause boards page starts a cause board and opens the editor while connected', async ({ page }) => {
    await connectHardhat0(page)

    await page.getByTestId('nav-causes').click()
    await expect(page.getByRole('heading', { name: 'Cause boards' })).toBeVisible()
    await page.getByTestId('causes-start-cause').click()

    await expect(page.getByTestId('cause-detail-page')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('wallet-connect-button')).toContainText(/Hardhat #0/i)
  })

  test('organizer publishes, revises, and shares stable and pinned cause pages', async ({ page }) => {
    test.setTimeout(180_000)
    await connectHardhat0(page)
    await startCause(page)

    await page.getByTestId('cause-add-plank').click()
    await page.getByTestId('plank-text-0').fill(
      'Every Oak Street block has working streetlights by June.',
    )
    await page.getByTestId('plank-publish-0').click()
    await expect(page.getByTestId('plank-row-published')).toHaveCount(1, { timeout: 60_000 })

    const slug = `oak-street-${Date.now()}`
    await page.getByTestId('roster-title').fill('Safer Oak Street')
    await page.getByTestId('roster-summary').fill('Neighbors organizing for working streetlights.')
    await page.getByTestId('roster-slug').fill(slug)

    // Publishing without a badge is an explicit peer action, not an admission bypass.
    await page.getByTestId('roster-publish-anyway').click()
    await expect(page).toHaveURL(new RegExp(`/cause/0x[0-9a-f]{40}/${slug}$`), {
      timeout: 60_000,
    })
    const stableUrl = page.url()
    await expect(page.getByTestId('cause-unpublished')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Safer Oak Street' })).toBeVisible()

    // Live causes open in viewing; revision needs the organizer editing surface.
    await page.getByTestId('cause-mode-editing').click()

    // A revision updates the stable ref while preserving the first immutable version.
    await page.getByTestId('roster-summary').fill(
      'Neighbors organizing for working streetlights and safer evening walks.',
    )
    await page.getByTestId('roster-publish-anyway').click()
    await expect(page).toHaveURL(stableUrl, { timeout: 60_000 })
    await expect(page.getByTestId('roster-history')).toContainText('2 versions', {
      timeout: 30_000,
    })

    const versionLinks = page.getByTestId('roster-history').getByRole('link')
    await expect(versionLinks).toHaveCount(2)
    const pinnedHref = await versionLinks.last().getAttribute('href')
    expect(pinnedHref).toContain(`/${slug}@`)

    await versionLinks.last().click()
    await expect(page.getByText('Pinned version', { exact: true })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Neighbors organizing for working streetlights.', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open current' })).toBeVisible()

    await page.getByRole('link', { name: 'Open current' }).click()
    await expect(page).toHaveURL(stableUrl)
    await expect(page.locator('p').filter({
      hasText: /^Neighbors organizing for working streetlights and safer evening walks\.$/,
    })).toBeVisible()
  })

  test('visitor selects and signs planks, inspects support and projects, and follows cause versions', async ({ page }) => {
    test.setTimeout(240_000)
    await connectHardhat0(page)
    await startCause(page)

    const statements = [
      'Every Oak Street block has working streetlights by June.',
      'Crosswalks near Oak Street School are repainted before winter.',
    ]
    for (const [index, statement] of statements.entries()) {
      await page.getByTestId('cause-add-plank').click()
      await page.getByTestId(`plank-text-${index}`).fill(statement)
      await page.getByTestId(`plank-publish-${index}`).click()
      await expect(page.getByTestId('plank-row-published')).toHaveCount(index + 1, {
        timeout: 60_000,
      })
    }

    const slug = `oak-street-visitors-${Date.now()}`
    await page.getByTestId('roster-title').fill('Safer Oak Street for visitors')
    await page.getByTestId('roster-summary').fill('Neighbors organizing for safer evening walks.')
    await page.getByTestId('roster-slug').fill(slug)
    const versionPreview = await page.getByText(/^Would-be version:/).textContent()
    const versionCid = versionPreview?.match(/Would-be version:\s*(\S+)/)?.[1]
    expect(versionCid).toBeTruthy()
    await page.getByTestId('roster-publish-anyway').click()
    await expect(page).toHaveURL(new RegExp(`/cause/0x[0-9a-f]{40}/${slug}$`), {
      timeout: 60_000,
    })
    const stableUrl = page.url()
    const pinnedHref = `${stableUrl}@${versionCid}`

    // Enter the shared URL as a visitor with no organizer-local draft state.
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await page.goto(stableUrl)
    await expect(page.getByRole('heading', { name: 'Safer Oak Street for visitors' })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByTestId('roster-publish-panel')).toBeHidden()
    await expect(page.getByTestId('plank-row-published')).toHaveCount(2)

    // Counts explain their provenance; the visitor can narrow the derived view without
    // changing the organizer's roster, then explicitly review the exact selected CIDs.
    await connectHardhat(page, 1)
    await expect(page.getByText(/direct signer.*indirect supporter/i)).toHaveCount(2, { timeout: 30_000 })
    await page.getByTestId('plank-in-totals-1').click()
    await expect(page.getByTestId('plank-in-totals-1')).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByTestId('selected-plank-support')).toBeVisible()
    await expect(page.getByTestId('support-selected-planks')).toBeEnabled({ timeout: 30_000 })
    await page.getByTestId('plank-in-totals-1').click()
    await expect(page.getByTestId('plank-in-totals-1')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('support-selected-planks')).toBeEnabled()

    await page.getByTestId('support-selected-planks').click()
    await expect(page.getByTestId('selected-plank-support')).toContainText(/Signed 2 statements/, {
      timeout: 60_000,
    })
    await expect(page.getByTestId('support-selected-planks')).toHaveCount(0)

    // Every immutable plank retains its own statement page (fundable projects live there).
    await page.getByRole('link', { name: /project/i }).first().click()
    await expect(page).toHaveURL(/\/statement\/[^/]+/)
    await expect(page.getByRole('heading', { name: /fundable projects/i })).toBeVisible({ timeout: 30_000 })

    await page.goto(pinnedHref!)
    await expect(page.getByText('Pinned version', { exact: true })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Neighbors organizing for safer evening walks.', { exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Open current' }).click()
    await expect(page).toHaveURL(stableUrl)
    await expect(page.getByText('Neighbors organizing for safer evening walks.', { exact: true })).toBeVisible()
  })
})
