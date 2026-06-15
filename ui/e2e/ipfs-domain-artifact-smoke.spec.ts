import { expect, test } from '@playwright/test'

type DomainSmoke = {
  slug: string
  brand: string
  visibleBrand: RegExp
  deepLinks: string[]
  wrongDomainRoute: string
}

const domains: DomainSmoke[] = [
  { slug: 'commonality', brand: 'Commonality', visibleBrand: /Commonality/i, deepLinks: ['/docs', '/founders', '/participate'], wrongDomainRoute: '/projects' },
  { slug: 'lazyGiving', brand: 'LazyGiving', visibleBrand: /LazyGiving/i, deepLinks: ['/projects', '/projects/new', '/delegation/notes'], wrongDomainRoute: '/statement/bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku' },
  { slug: 'alignment', brand: 'Alignment', visibleBrand: /Align(?:ment|ing)/i, deepLinks: ['/explore'], wrongDomainRoute: '/content' },
  { slug: 'tally', brand: 'Tally', visibleBrand: /Tally/i, deepLinks: ['/statements', '/profile'], wrongDomainRoute: '/projects' },
  { slug: 'content-funding', brand: 'Content Funding', visibleBrand: /Content Funding/i, deepLinks: ['/content', '/content/dashboard'], wrongDomainRoute: '/statement/bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku' },
  { slug: 'civility', brand: 'Civility', visibleBrand: /Civility/i, deepLinks: ['/criteria', '/content'], wrongDomainRoute: '/projects' },
  { slug: 'common-sense-majority', brand: 'Common Sense Majority', visibleBrand: /Common Sense Majority/i, deepLinks: ['/about', '/organize', '/popular-statements'], wrongDomainRoute: '/projects' },
  { slug: 'conceptspace', brand: 'Conceptspace', visibleBrand: /Conceptspace/i, deepLinks: ['/explore', '/docs'], wrongDomainRoute: '/projects' },
]

test.describe('IPFS domain artifacts', () => {
  for (const domain of domains) {
    test(`${domain.brand} artifact home and representative deep links reload`, async ({ page }) => {
      const consoleErrors: string[] = []
      page.on('console', message => {
        if (message.type() === 'error') consoleErrors.push(message.text())
      })

      await page.goto(`/${domain.slug}/`)
      await expect(page.locator('body')).toContainText(domain.visibleBrand)
      await expect(page.locator('main, body').first()).not.toBeEmpty()

      const links = await page.locator('a[href]').evaluateAll(anchors => anchors.map(anchor => anchor.getAttribute('href') ?? ''))
      expect(links.some(href => href && href !== '#'), `${domain.brand} should render navigable links`).toBe(true)

      for (const deepLink of domain.deepLinks) {
        await page.goto(`/${domain.slug}${deepLink}`)
        await expect(page.locator('body')).not.toContainText('Not found')
        await page.reload()
        await expect(page.locator('body')).not.toContainText('Not found')
        await expect(page.locator('body')).not.toContainText('404')
      }

      await page.goto(`/${domain.slug}/#${domain.wrongDomainRoute}`)
      await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible()
      await expect(page.getByText(/The link may be outdated or mistyped/i)).toBeVisible()
      await page.reload()
      await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible()

      expect(consoleErrors, `${domain.brand} artifact should render without console errors`).toEqual([])
    })
  }
})
