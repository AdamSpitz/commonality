import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Each Playwright project launches a separate Vite dev server on a distinct port
 * so tests run against the domain that owns the routes they exercise:
 *
 *   tally           → 5173  (statement signing, belief expression, user profile)
 *   pubstarter      → 5174  (individual project contracts)
 *   content-funding → 5175  (content funding contracts, creator dashboard)
 *   delegation      → 5176  (delegation)
 */
export default defineConfig({
  testDir: './e2e',
  /* Disable parallel execution to avoid blockchain state conflicts.
   * Tests that modify blockchain state (creating statements, expressing beliefs)
   * must run serially to prevent race conditions in the shared Docker backend
   * (Hardhat node, IPFS, GraphQL indexer). */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Run tests serially to avoid blockchain state conflicts */
  workers: 1,
  /* Increase timeout: blockchain indexing can take 30-60 seconds per statement */
  timeout: 120000,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Capture screenshot on failure for debugging */
    screenshot: 'only-on-failure',
    /* Capture video on failure for debugging */
    video: 'retain-on-failure',
  },

  /* Global setup/teardown for Docker services */
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  /* Configure projects per domain. Each project matches the test files that
   * exercise routes owned by that domain. */
  projects: [
    {
      name: 'tally',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5173' },
      testMatch: [
        'statement-creation.spec.ts',
        'statement-creation-form.spec.ts',
        'belief-expression.spec.ts',
        'wallet-connection.spec.ts',
        'browse-statements.spec.ts',
        'user-profile.spec.ts',
        'subjectiv-flow.spec.ts',
        'negative-paths.spec.ts',
      ],
    },
    {
      name: 'pubstarter',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5174' },
      testMatch: [
        'pubstarter-flow.spec.ts',
      ],
    },
    {
      name: 'content-funding',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5175' },
      testMatch: [
        'content-funding-flow.spec.ts',
      ],
    },
    {
      name: 'delegation',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5176' },
      testMatch: [
        'delegation-flow.spec.ts',
      ],
    },
  ],

  /* One dev server per domain, on separate ports. */
  webServer: [
    {
      command: 'VITE_DOMAIN=tally npm run dev -- --port 5173',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'VITE_DOMAIN=pubstarter npm run dev -- --port 5174',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'VITE_DOMAIN=content-funding npm run dev -- --port 5175',
      url: 'http://localhost:5175',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'VITE_DOMAIN=delegation npm run dev -- --port 5176',
      url: 'http://localhost:5176',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
