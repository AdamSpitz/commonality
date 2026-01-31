import { test, expect } from './fixtures/wallet'

/**
 * E2E tests for wallet connection using Hardhat test accounts.
 *
 * This is a "tracer bullet" test - the smallest possible end-to-end test
 * that validates wallet injection works with real backend services.
 *
 * These tests use:
 * - Playwright for browser automation
 * - Hardhat node (started by Docker via global-setup.ts)
 * - Wagmi's mock connector to inject test accounts
 * - ConnectKit UI for wallet connection
 */

test.describe('Wallet Connection', () => {
  test('should connect a Hardhat test account and display the address', async ({
    page,
    wallet,
  }) => {
    // Navigate to home page
    await page.goto('/')

    // Initially, no wallet should be connected
    // The Connect Wallet button should be visible
    await expect(page.getByRole('button', { name: /connect/i })).toBeVisible()

    // Connect ACCOUNT_0 (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
    await wallet.connect('ACCOUNT_0')

    // After connection, the address should be visible in the Alert
    await expect(page.getByText(/Connected as:/i)).toBeVisible()
    await expect(
      page.getByText(`Connected as: ${wallet.address}`)
    ).toBeVisible()

    // Verify the wallet fixture stored the correct address
    expect(wallet.address).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
  })

  test('should connect different test accounts in different tests', async ({
    page,
    wallet,
  }) => {
    await page.goto('/')

    // Connect ACCOUNT_1 (0x70997970C51812dc3A010C7d01b50e0d17dc79C8)
    await wallet.connect('ACCOUNT_1')

    // Verify ACCOUNT_1's address is displayed in the Alert
    await expect(page.getByText(/Connected as:/i)).toBeVisible()
    await expect(
      page.getByText(`Connected as: ${wallet.address}`)
    ).toBeVisible()

    // Verify the wallet fixture stored the correct address
    expect(wallet.address).toBe('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')
  })

  test('should show connected state on the home page', async ({
    page,
    wallet,
  }) => {
    await page.goto('/')

    // Connect wallet
    await wallet.connect('ACCOUNT_0')

    // The home page should show connected state
    // Based on HomePage.tsx, it shows "Welcome back!" when connected
    await expect(page.getByText(/welcome back/i)).toBeVisible()

    // It should show the connected address in an alert
    await expect(page.getByText(/connected as/i)).toBeVisible()
  })
})
