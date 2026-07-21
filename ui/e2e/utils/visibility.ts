import { expect, type Locator, type Page } from '@playwright/test'

type VisibleText = string | RegExp

interface ExpectTextVisibleEventuallyOptions {
  timeoutMs?: number
  attemptTimeoutMs?: number
  reloadIntervalMs?: number
  exact?: boolean
}

/**
 * Wait for text that is backed by freshly-indexed data to appear in the app.
 *
 * The deep-stack E2E tests create on-chain objects outside the browser, then
 * navigate to pages whose React queries/metadata fetches may have already read
 * a just-before-indexed empty result. Retrying with a page reload distinguishes
 * "the indexed object is not yet visible to this browser session" from a real
 * assertion failure without adding blind sleeps to every flow.
 */
async function expectVisibleEventually(
  page: Page,
  locate: () => Locator,
  label: string,
  options: ExpectTextVisibleEventuallyOptions = {}
): Promise<void> {
  const {
    timeoutMs = 60_000,
    attemptTimeoutMs = 5_000,
    reloadIntervalMs = 250,
  } = options
  const deadline = Date.now() + timeoutMs
  let lastError: unknown

  while (Date.now() < deadline) {
    try {
      await expect(locate()).toBeVisible({ timeout: attemptTimeoutMs })
      return
    } catch (error) {
      lastError = error
    }

    if (Date.now() >= deadline) break
    await page.waitForTimeout(reloadIntervalMs)
    await page.reload({ waitUntil: 'domcontentloaded' })
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Timed out waiting for ${label} to become visible`)
}

export async function expectTextVisibleEventually(
  page: Page,
  text: VisibleText,
  options: ExpectTextVisibleEventuallyOptions = {}
): Promise<void> {
  await expectVisibleEventually(
    page,
    () => page.getByText(text, { exact: options.exact }),
    `text ${String(text)}`,
    options
  )
}

export async function expectLocatorVisibleEventually(
  page: Page,
  locate: () => Locator,
  label: string,
  options: ExpectTextVisibleEventuallyOptions = {}
): Promise<void> {
  await expectVisibleEventually(page, locate, label, options)
}
