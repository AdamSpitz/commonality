import { test, expect } from './fixtures/console-errors'

/**
 * E2E smoke for the Browse Statements page.
 *
 * Unlike the historical version of this file (which navigated to `/browse` —
 * not a real route — and only checked `page.url()` stayed on it), these tests
 * assert the *domain* surface actually rendered: the page heading, the sort
 * control, and a terminal domain state (statement cards, or the empty-state
 * the component renders when the indexer returns no statements). A 404 / blank
 * / stuck-spinner page can no longer pass.
 *
 * Under the E2E global setup the local stack (Hardhat + indexer) is up, so
 * `BrowseStatementsPage` fetches successfully. The stack is unseeded, so the
 * usual terminal state is the "No statements found" empty state — unless an
 * earlier test in the same serial run already created statements, in which
 * case cards render. Both are valid successful outcomes; both assert the whole
 * route → component → GraphQL → render path worked.
 */

// Terminal-state markers taken from BrowseStatementsPage.tsx so this stays
// coupled to the real rendered output, not to incidental markup.
const EMPTY_STATE = /No statements found\. Be the first to create one/i
// Each statement card is a RouterLink CardActionArea to `/statement/<cid>`.
const FIRST_STATEMENT_LINK = 'a[href^="/statement/"]'

test.describe('Browse Statements Page', () => {
  test('renders the browse surface with heading, sort control, and a terminal domain state', async ({ page }) => {
    // Start at the tally landing to confirm routing boots, then enter the
    // statements route. (`/` renders TallyLandingPage, not the /start HomePage.)
    await page.goto('/')
    await expect(
      page.getByRole('heading', {
        name: /Petitions and polls, in your own words/i,
        level: 1,
      })
    ).toBeVisible()

    await page.goto('/statements')
    // Sanity: we are on the real browse route, not a stray/404 URL the test
    // itself fabricated.
    await expect(page).toHaveURL(/\/statements$/)

    // Domain chrome — always present regardless of data.
    await expect(
      page.getByRole('heading', { name: 'Browse Statements', level: 1 })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Most Supporters/i })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Newest/i })
    ).toBeVisible()

    // Loading must resolve into a real domain outcome: the empty-state
    // (indexer has no statements) or at least one statement card. A perpetual
    // spinner or a blank/404 page fails here. `.or()` lets either win.
    const terminalState = page
      .getByText(EMPTY_STATE)
      .or(page.locator(FIRST_STATEMENT_LINK).first())
    await expect(terminalState).toBeVisible({ timeout: 20_000 })
  })

  test('sort control switches between Most Supporters and Newest without leaving the route', async ({ page }) => {
    await page.goto('/statements')
    await expect(
      page.getByRole('heading', { name: 'Browse Statements', level: 1 })
    ).toBeVisible()

    // The Newest toggle must be an interactive control that keeps us on the
    // browse surface — a regression where the sort control disappears or
    // unmounts the page would fail here.
    const newestButton = page.getByRole('button', { name: /Newest/i })
    await expect(newestButton).toBeEnabled()
    await newestButton.click()
    await expect(page).toHaveURL(/\/statements$/)

    // Re-selecting Most Supporters should round-trip without error.
    const mostSupportersButton = page.getByRole('button', { name: /Most Supporters/i })
    await expect(mostSupportersButton).toBeEnabled()
    await mostSupportersButton.click()
    await expect(page).toHaveURL(/\/statements$/)

    // The terminal domain state must still hold after re-sorting.
    const terminalState = page
      .getByText(EMPTY_STATE)
      .or(page.locator(FIRST_STATEMENT_LINK).first())
    await expect(terminalState).toBeVisible({ timeout: 20_000 })
  })
})