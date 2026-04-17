import { test, expect } from './fixtures/wallet'

/**
 * E2E tests for statement creation form - MINIMAL VERSION
 *
 * This test validates that the form UI works correctly without attempting
 * to submit transactions. It's a diagnostic test to help identify whether
 * the timeout issue is in the UI or the transaction flow.
 *
 * These tests use:
 * - Playwright for browser automation
 * - Hardhat node (started by Docker via global-setup.ts)
 * - Wagmi's mock connector to inject test accounts
 */

test.describe('Statement Creation Form (UI Only)', () => {
  test('should display the create statement form when button is clicked', async ({
    page,
    wallet,
  }) => {
    // Navigate to home page
    await page.goto('/')

    // Connect wallet first
    await wallet.connect('ACCOUNT_0')

    // Wait for connected state
    await expect(page.getByText(/ready to take the next step/i)).toBeVisible()

    // Click the "Create and Sign Statement" button
    await page
      .getByRole('button', { name: /create and sign statement/i })
      .click()

    // The form should now be visible
    await expect(
      page.getByRole('heading', { name: /create a statement/i })
    ).toBeVisible()

    // The text field should be visible
    await expect(
      page.getByRole('textbox', { name: /statement content/i })
    ).toBeVisible()

    // The submit button should be visible but disabled (no content yet)
    const submitButton = page.getByRole('button', {
      name: /create and sign statement/i,
    })
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toBeDisabled()
  })

  test('should enable submit button when content is entered', async ({
    page,
    wallet,
  }) => {
    await page.goto('/')
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByText(/ready to take the next step/i)).toBeVisible()

    // Show the form
    await page
      .getByRole('button', { name: /create and sign statement/i })
      .click()

    // Wait for form to be visible
    await expect(
      page.getByRole('heading', { name: /create a statement/i })
    ).toBeVisible()

    // The submit button should be disabled initially
    const submitButton = page.getByRole('button', {
      name: /create and sign statement/i,
    })
    await expect(submitButton).toBeDisabled()

    // Fill in the content field
    const contentField = page.getByRole('textbox', {
      name: /statement content/i,
    })
    await contentField.fill('This is a test statement for E2E testing')

    // Now the submit button should be enabled
    await expect(submitButton).toBeEnabled()
  })

  test('should show cancel button that hides the form', async ({
    page,
    wallet,
  }) => {
    await page.goto('/')
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByText(/ready to take the next step/i)).toBeVisible()

    // Show the form
    await page
      .getByRole('button', { name: /create and sign statement/i })
      .click()

    // Wait for form to be visible
    await expect(
      page.getByRole('heading', { name: /create a statement/i })
    ).toBeVisible()

    // Click the cancel button
    await page.getByRole('button', { name: /cancel/i }).click()

    // The form should be hidden, and the "Create and Sign Statement" button should be visible again
    await expect(
      page.getByRole('heading', { name: /create a statement/i })
    ).not.toBeVisible()

    // The original button should be visible again
    await expect(
      page.getByRole('button', { name: /create and sign statement/i })
    ).toBeVisible()
  })

  test('should display validation error for empty content', async ({
    page,
    wallet,
  }) => {
    await page.goto('/')
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByText(/ready to take the next step/i)).toBeVisible()

    // Show the form
    await page
      .getByRole('button', { name: /create and sign statement/i })
      .click()

    await expect(
      page.getByRole('heading', { name: /create a statement/i })
    ).toBeVisible()

    // Fill with whitespace only
    const contentField = page.getByRole('textbox', {
      name: /statement content/i,
    })
    await contentField.fill('   ')

    // Submit button should still be disabled (content.trim() is empty)
    const submitButton = page.getByRole('button', {
      name: /create and sign statement/i,
    })
    await expect(submitButton).toBeDisabled()
  })
})
