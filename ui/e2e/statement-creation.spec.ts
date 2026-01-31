import { test, expect } from './fixtures/wallet'

/**
 * E2E test for full statement creation workflow with enhanced debugging.
 *
 * This test includes:
 * - Browser console logging to capture JavaScript errors
 * - Screenshot capture on failure
 * - Full transaction submission and waiting for success
 *
 * These tests use:
 * - Playwright for browser automation
 * - Hardhat node (started by Docker via global-setup.ts)
 * - Wagmi's mock connector to inject test accounts
 * - Real contract interactions (not mocked)
 */

test.describe('Statement Creation Workflow', () => {
  test('should create a statement and see it appear on browse page', async ({
    page,
    wallet,
  }) => {
    // Set up console logging BEFORE navigating to the page
    const consoleMessages: string[] = []
    const consoleErrors: string[] = []

    page.on('console', (msg) => {
      const text = msg.text()
      consoleMessages.push(`[${msg.type()}] ${text}`)

      // Track errors separately for easy visibility
      if (msg.type() === 'error') {
        consoleErrors.push(text)
      }
    })

    // Also capture page errors (uncaught exceptions)
    page.on('pageerror', (error) => {
      consoleErrors.push(`PAGE ERROR: ${error.message}\n${error.stack}`)
    })

    try {
      // Navigate to home page
      await page.goto('/')

      // Connect wallet
      await wallet.connect('ACCOUNT_0')
      await expect(page.getByText(/welcome back/i)).toBeVisible()

      // Click the "Create and Sign Statement" button to show the form
      await page
        .getByRole('button', { name: /create and sign statement/i })
        .click()

      // Wait for form to be visible
      await expect(
        page.getByRole('heading', { name: /create a statement/i })
      ).toBeVisible()

      // Fill in the statement content
      const statementContent = `Test statement created at ${Date.now()}`
      const contentField = page.getByRole('textbox', {
        name: /statement content/i,
      })
      await contentField.fill(statementContent)

      // Wait for submit button to be enabled
      const submitButton = page.getByRole('button', {
        name: /create and sign statement/i,
      })
      await expect(submitButton).toBeEnabled()

      console.log('\n=== SUBMITTING STATEMENT ===')
      console.log('Statement content:', statementContent)
      console.log('Wallet address:', wallet.address)

      // Click submit button
      await submitButton.click()

      console.log('Submit button clicked, waiting for success message...')

      // Wait for success message (increased timeout to 60 seconds for transaction + indexing)
      // The success message should appear after:
      // 1. Transaction is submitted to blockchain
      // 2. Transaction is mined
      // 3. Indexer picks up the event
      // 4. UI polls GraphQL and gets the new statement
      await expect(
        page.getByText(/statement created and signed successfully/i)
      ).toBeVisible({ timeout: 60000 })

      console.log('Success message appeared!')

      // Navigate to browse page
      await page.goto('/statements')

      // The statement should appear in the list
      await expect(page.getByText(statementContent)).toBeVisible({
        timeout: 10000,
      })

      console.log('Statement found on browse page!')
    } catch (error) {
      // On failure, log all console messages and errors
      console.log('\n=== TEST FAILED ===')
      console.log('\n=== ALL CONSOLE MESSAGES ===')
      consoleMessages.forEach((msg) => console.log(msg))

      console.log('\n=== CONSOLE ERRORS ===')
      if (consoleErrors.length === 0) {
        console.log('No console errors captured')
      } else {
        consoleErrors.forEach((err) => console.log(err))
      }

      // Take a screenshot for visual debugging
      const screenshotPath = `test-results/statement-creation-failure-${Date.now()}.png`
      await page.screenshot({ path: screenshotPath, fullPage: true })
      console.log(`\nScreenshot saved to: ${screenshotPath}`)

      // Re-throw the error to fail the test
      throw error
    }
  })

  test('should show validation error for empty statement', async ({
    page,
    wallet,
  }) => {
    const consoleMessages: string[] = []
    const consoleErrors: string[] = []

    page.on('console', (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`)
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    page.on('pageerror', (error) => {
      consoleErrors.push(`PAGE ERROR: ${error.message}`)
    })

    try {
      await page.goto('/')
      await wallet.connect('ACCOUNT_0')
      await expect(page.getByText(/welcome back/i)).toBeVisible()

      // Show the form
      await page
        .getByRole('button', { name: /create and sign statement/i })
        .click()

      await expect(
        page.getByRole('heading', { name: /create a statement/i })
      ).toBeVisible()

      // Try to submit without content (button should be disabled)
      const submitButton = page.getByRole('button', {
        name: /create and sign statement/i,
      })
      await expect(submitButton).toBeDisabled()

      // Fill with only whitespace
      const contentField = page.getByRole('textbox', {
        name: /statement content/i,
      })
      await contentField.fill('   ')

      // Submit button should still be disabled
      await expect(submitButton).toBeDisabled()
    } catch (error) {
      console.log('\n=== TEST FAILED ===')
      console.log('\n=== CONSOLE ERRORS ===')
      consoleErrors.forEach((err) => console.log(err))

      const screenshotPath = `test-results/validation-failure-${Date.now()}.png`
      await page.screenshot({ path: screenshotPath, fullPage: true })
      console.log(`\nScreenshot saved to: ${screenshotPath}`)

      throw error
    }
  })
})
