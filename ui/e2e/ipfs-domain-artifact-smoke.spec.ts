import { expect, test } from '@playwright/test'

import { type ConsoleErrorSummary, filterActionableArtifactConsoleErrors } from './fixtures/benign-console-errors'

type DomainSmoke = {
  slug: string
  hostname: string
  brand: string
  visibleBrand: RegExp
  deepLinks: string[]
  wrongDomainRoute: string
}

const domains: DomainSmoke[] = [
  { slug: 'causestarter', hostname: 'causestarter.localhost', brand: 'CauseStarter', visibleBrand: /CauseStarter/i, deepLinks: ['/causes', '/docs'], wrongDomainRoute: '/founders' },
  { slug: 'civility', hostname: 'civility.localhost', brand: 'Civility', visibleBrand: /Civility/i, deepLinks: ['/criteria', '/content'], wrongDomainRoute: '/projects' },
  { slug: 'common-sense-majority', hostname: 'common-sense-majority.localhost', brand: 'Common Sense Majority', visibleBrand: /Common Sense Majority/i, deepLinks: ['/about', '/organize', '/popular-statements'], wrongDomainRoute: '/projects' },
]

test.describe('IPFS domain artifacts', () => {
  for (const domain of domains) {
    test(`${domain.brand} artifact home and representative deep links reload`, async ({ page }) => {
      const consoleErrors: ConsoleErrorSummary[] = []
      page.on('console', message => {
        if (message.type() === 'error') {
          const location = message.location()
          consoleErrors.push({ text: message.text(), url: location.url || undefined })
        }
      })

      const domainUrl = `http://${domain.hostname}:8088/#`

      await page.goto(`${domainUrl}/`)
      await expect(page.locator('body')).toContainText(domain.visibleBrand)
      await expect(page.locator('main, body').first()).not.toBeEmpty()

      const links = await page.locator('a[href]').evaluateAll(anchors => anchors.map(anchor => anchor.getAttribute('href') ?? ''))
      expect(links.some(href => href && href !== '#'), `${domain.brand} should render navigable links`).toBe(true)

      for (const deepLink of domain.deepLinks) {
        await page.goto(`${domainUrl}${deepLink}`)
        await expect(page.locator('body')).not.toContainText('Not found')
        await page.reload()
        await expect(page.locator('body')).not.toContainText('Not found')
        await expect(page.locator('body')).not.toContainText('404')
      }

      await page.goto(`${domainUrl}${domain.wrongDomainRoute}`)
      await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible()
      await expect(page.getByText(/The link may be outdated or mistyped/i)).toBeVisible()
      await page.reload()
      await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible()

      expect(
        filterActionableArtifactConsoleErrors(consoleErrors),
        `${domain.brand} artifact should render without actionable console errors`
      ).toEqual([])
    })
  }
})
