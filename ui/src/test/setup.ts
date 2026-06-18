import '@testing-library/jest-dom/vitest'
import { beforeAll, beforeEach, afterAll, vi } from 'vitest'

// Provide indexedDB for tests (used by contactStore, nudgeStore, etc.)
import 'fake-indexeddb/auto'

const envVarsThatShouldNotLeakFromLocalDeployment = [
  'VITE_CHAIN_ID',
  'VITE_COMMONALITY_URL',
  'VITE_LAZYGIVING_URL',
  'VITE_ALIGNMENT_URL',
  'VITE_TALLY_URL',
  'VITE_CONTENT_FUNDING_URL',
  'VITE_CIVILITY_URL',
  'VITE_COMMON_SENSE_MAJORITY_URL',
  'VITE_CONCEPTSPACE_URL',
  'VITE_DEFAULT_TRUSTED_ATTESTERS',
  'VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS',
  'VITE_DEFAULT_TRUSTED_BEAT_AGENTS',
  'VITE_DEFAULT_NUDGERS',
  'VITE_CSM_MEDIATOR_NUDGER',
]

function clearLocalDeploymentEnv(): void {
  for (const key of envVarsThatShouldNotLeakFromLocalDeployment) {
    vi.stubEnv(key, '')
  }
}

clearLocalDeploymentEnv()

// Store original console methods
const originalConsoleError = console.error
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn

const expectedConsoleErrorSubstrings = [
  // React act() warnings - these are mostly false positives in testing-library
  'inside a test was not wrapped in act(',

  // Application error paths intentionally exercised by tests
  'Attestation failed',
  'Delegate failed',
  'Deposit failed',
  'Error burning tokens',
  'Error buying tokens',
  'Error buying tokens with note',
  'Error creating',
  'Error fulfilling buy order',
  'Error fulfilling sale listing',
  'Error loading',
  'Error refunding tokens',
  'Error withdrawing funds',
  'Failed to load delegatable notes',
  'Reclaim failed',
  'Revoke failed',
  'Statement creation complete',
  'Statement signed',
  'Statement uploaded to IPFS',
  'Created statements list updated',

  // Expected jsdom limitation when tests click normal external links
  'Not implemented: navigation to another Document',
]

// Suppress console output during tests
beforeAll(() => {
  // Filter out expected error messages
  console.error = (...args: unknown[]) => {
    const message = args.map(arg => String(arg)).join(' ')

    if (expectedConsoleErrorSubstrings.some(substring => message.includes(substring))) {
      return
    }

    // Pass through unexpected errors
    originalConsoleError(...args)
  }

  // Suppress console.log from application code during tests
  console.log = (...args: unknown[]) => {
    const message = String(args[0])

    // Suppress expected log messages from application code
    if (message.includes('Statement creation complete') ||
        message.includes('Statement uploaded to IPFS') ||
        message.includes('Statement signed') ||
        message.includes('Created statements list updated')) {
      return
    }

    // Pass through other logs (might be useful for debugging)
    originalConsoleLog(...args)
  }

  console.warn = vi.fn()
})

beforeEach(() => {
  clearLocalDeploymentEnv()
})

// Restore console methods after tests
afterAll(() => {
  console.error = originalConsoleError
  console.log = originalConsoleLog
  console.warn = originalConsoleWarn
})
