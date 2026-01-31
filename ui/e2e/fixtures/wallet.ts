import { test as base, type Page } from '@playwright/test'
import { privateKeyToAccount } from 'viem/accounts'
import type { Address, Hex } from 'viem'
import type { MockParameters } from 'wagmi/connectors'
import { TEST_PRIVATE_KEYS } from '@commonality/sdk'

/**
 * Hardhat test account names mapped to their private keys.
 * These are the well-known Hardhat test accounts with 10,000 ETH each.
 */
const ACCOUNT_PRIVATE_KEYS = {
  ACCOUNT_0: TEST_PRIVATE_KEYS.ACCOUNT_0,
  ACCOUNT_1: TEST_PRIVATE_KEYS.ACCOUNT_1,
  ACCOUNT_2: TEST_PRIVATE_KEYS.ACCOUNT_2,
  ACCOUNT_3: TEST_PRIVATE_KEYS.ACCOUNT_3,
  ACCOUNT_4: TEST_PRIVATE_KEYS.ACCOUNT_4,
  ACCOUNT_5: TEST_PRIVATE_KEYS.ACCOUNT_5,
  ACCOUNT_6: TEST_PRIVATE_KEYS.ACCOUNT_6,
  ACCOUNT_7: TEST_PRIVATE_KEYS.ACCOUNT_7,
  ACCOUNT_8: TEST_PRIVATE_KEYS.ACCOUNT_8,
  ACCOUNT_9: TEST_PRIVATE_KEYS.ACCOUNT_9,
} as const

export type AccountName = keyof typeof ACCOUNT_PRIVATE_KEYS

/**
 * Wallet fixture for E2E tests.
 * Provides utilities to connect Hardhat test accounts via wagmi's mock connector.
 */
export class WalletFixture {
  address?: Address
  #page: Page

  constructor({ page }: { page: Page }) {
    this.#page = page
  }

  /**
   * Connect a Hardhat test account to the dApp.
   *
   * @param accountName - Name of the Hardhat test account (e.g., 'ACCOUNT_0')
   * @param features - Optional mock connector features
   *
   * @example
   * await wallet.connect('ACCOUNT_0')
   * // Now the dApp has account 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 connected
   */
  async connect(
    accountName: AccountName,
    features?: MockParameters['features']
  ): Promise<void> {
    const privateKey = ACCOUNT_PRIVATE_KEYS[accountName]
    const account = privateKeyToAccount(privateKey)
    this.address = account.address

    // Setup the mock wagmi config with this account
    await this.#setup(privateKey, features)

    // Click the mock connector button to "connect" the wallet
    await this.#clickConnect()
  }

  /**
   * Setup the mock wagmi config via the window._setupTestWallet function.
   * This function was exposed by main.tsx.
   */
  async #setup(
    privateKey: Hex,
    features?: MockParameters['features']
  ): Promise<void> {
    // Wait for the app to expose the setup function
    await this.#page.waitForFunction(() => window._setupTestWallet)

    // Call the setup function with the private key
    await this.#page.evaluate(
      ({ privateKey, features }) => {
        window._setupTestWallet(privateKey, features)
      },
      { privateKey, features }
    )
  }

  /**
   * Click the "Mock Connector" button to connect the wallet.
   * After calling #setup, the mock connector will be available in ConnectKit.
   */
  async #clickConnect(): Promise<void> {
    // Click the main Connect Wallet button
    await this.#page.getByRole('button', { name: /connect/i }).click()

    // Wait for the ConnectKit modal to appear and click Mock Connector
    // The mock connector should be available after we called _setupTestWallet
    await this.#page
      .getByRole('button', { name: /mock connector/i })
      .click({ timeout: 5000 })
  }
}

/**
 * Extended Playwright test with wallet fixture.
 * Use this instead of the default `test` import from '@playwright/test'.
 *
 * @example
 * import { test, expect } from './fixtures/wallet'
 *
 * test('connect wallet', async ({ page, wallet }) => {
 *   await page.goto('/')
 *   await wallet.connect('ACCOUNT_0')
 *   await expect(page.getByText(wallet.address!)).toBeVisible()
 * })
 */
export const test = base.extend<{ wallet: WalletFixture }>({
  wallet: async ({ page }, use) => {
    await use(new WalletFixture({ page }))
  },
})

export { expect } from '@playwright/test'
