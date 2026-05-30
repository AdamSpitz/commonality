import { expect, test } from '@playwright/test'

type DomainSmoke = {
  slug: string
  brand: string
  deepLinks: string[]
}

const domains: DomainSmoke[] = [
  { slug: 'commonality', brand: 'Commonality', deepLinks: ['/docs', '/founders', '/participate'] },
  { slug: 'lazyGiving', brand: 'LazyGiving', deepLinks: ['/projects', '/projects/new', '/delegation/notes'] },
  { slug: 'alignment', brand: 'Alignment', deepLinks: ['/explore'] },
  { slug: 'tally', brand: 'Tally', deepLinks: ['/statements', '/profile'] },
  { slug: 'content-funding', brand: 'Content Funding', deepLinks: ['/content', '/content/dashboard'] },
  { slug: 'civility', brand: 'Civility', deepLinks: ['/criteria', '/content'] },
  { slug: 'common-sense-majority', brand: 'Common Sense Majority', deepLinks: ['/about', '/organize', '/popular-statements'] },
  { slug: 'conceptspace', brand: 'Conceptspace', deepLinks: ['/explore', '/docs'] },
]

test.describe('IPFS domain artifacts', () => {
  for (const domain of domains) {
    test(`${domain.brand} artifact home and representative deep links reload`, async ({ page }) => {
      const consoleErrors: string[] = []
      page.on('console', message => {
        if (message.type() === 'error') consoleErrors.push(message.text())
      })

      await page.goto(`/${domain.slug}/`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByText(domain.brand).first()).toBeVisible()

      const links = await page.locator('a[href]').evaluateAll(anchors => anchors.map(anchor => anchor.getAttribute('href') ?? ''))
      expect(links.some(href => href && href !== '#'), `${domain.brand} should render navigable links`).toBe(true)

      for (const deepLink of domain.deepLinks) {
        await page.goto(`/${domain.slug}${deepLink}`)
        await expect(page.locator('body')).not.toContainText('Not found')
        await page.reload()
        await expect(page.locator('body')).not.toContainText('Not found')
        await expect(page.locator('body')).not.toContainText('404')
      }

      expect(consoleErrors, `${domain.brand} artifact should render without console errors`).toEqual([])
    })
  }
})
