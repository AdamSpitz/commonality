import { test as base, expect } from '@playwright/test'

/**
 * Base E2E fixture that fails each test if the browser reports console errors
 * or uncaught page errors while the test runs.
 */
export const test = base.extend<{ _browserErrorCollector: void }>({
  _browserErrorCollector: [
    async ({ page }, use) => {
      const browserErrors: string[] = []

      page.on('console', (message) => {
        if (message.type() === 'error') {
          const location = message.location()
          const source = location.url ? ` (${location.url}:${location.lineNumber})` : ''
          browserErrors.push(`${message.text()}${source}`)
        }
      })
      page.on('pageerror', (error) => {
        browserErrors.push(error.message)
      })

      await use()

      expect(browserErrors).toEqual([])
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
