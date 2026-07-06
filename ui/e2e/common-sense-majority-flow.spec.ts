import { test, expect } from '@playwright/test'

const TALLY_BASE_URL = 'http://localhost:5173'

test.describe('Common Sense Majority movement-to-action journey', () => {
  test('newcomer starts on CSM, opts into mediator suggestions, and reaches Tally action surface', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: /the sane majority needs infrastructure/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /The mission statement/i })).toBeVisible()

    const mediatorSection = page.locator('#mediator-opt-in')
    await expect(mediatorSection).toBeVisible()

    const mediatorUnavailable = await mediatorSection.getByText(/mediator nudger is not configured/i).isVisible().catch(() => false)
    expect(mediatorUnavailable, 'CSM verifier journey needs VITE_CSM_MEDIATOR_NUDGER configured so opt-in is testable').toBe(false)

    await mediatorSection.getByRole('switch', { name: /Not showing mediator suggestions/i }).click()
    await expect(mediatorSection.getByText(/Opted in/i)).toBeVisible()
    await expect(mediatorSection.getByRole('switch', { name: /Showing mediator suggestions/i })).toBeChecked()

    const trustedNudgers = await page.evaluate(() => window.localStorage.getItem('commonality:trustedNudgers'))
    expect(trustedNudgers, 'mediator opt-in should persist a trusted nudger entry').toContain('Common Sense Majority')

    const tallyOptInHref = await page.getByRole('link', { name: /Open Tally with mediator enabled/i }).getAttribute('href')
    expect(tallyOptInHref, 'CSM action link should point at Tally nudger setup').toContain('/settings?addNudger=')
    const localTallyOptInUrl = new URL(tallyOptInHref!)
    const localTallyBaseUrl = new URL(TALLY_BASE_URL)
    localTallyOptInUrl.protocol = localTallyBaseUrl.protocol
    localTallyOptInUrl.host = localTallyBaseUrl.host
    await page.goto(localTallyOptInUrl.toString())
    await expect(page).toHaveURL((url) => url.origin === TALLY_BASE_URL && url.pathname.includes('/settings'))

    await expect(page.getByRole('heading', { name: /trust settings/i })).toBeVisible({ timeout: 20000 })
    await expect(page.getByText(/Nudger addresses/i)).toBeVisible()
    await expect(page.getByText(/Common Sense Majority/i)).toBeVisible()
  })
})
