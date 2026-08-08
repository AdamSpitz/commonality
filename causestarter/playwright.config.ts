import { defineConfig, devices } from '@playwright/test'

/**
 * CauseStarter browser smokes.
 *
 * Default: hit the Docker SPA at http://localhost:8090 (hash routing).
 * Override with CAUSESTARTER_BASE_URL (e.g. http://localhost:5174 for vite dev).
 *
 * Does not start Docker or a local webServer — run
 * `./scripts/deploy-causestarter.sh` (or services.sh / `npm run causestarter:dev`)
 * first. If the base URL is down, navigation fails with a normal timeout.
 */
const baseURL = (process.env.CAUSESTARTER_BASE_URL || 'http://localhost:8090').replace(/\/$/, '')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
