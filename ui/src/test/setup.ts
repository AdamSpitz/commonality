import '@testing-library/jest-dom/vitest'
import { beforeAll, afterAll, vi } from 'vitest'

// Store original console methods
const originalConsoleError = console.error
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn

// Suppress console output during tests
beforeAll(() => {
  // Filter out expected error messages and React act() warnings
  console.error = (...args: unknown[]) => {
    const message = String(args[0])

    // Suppress React act() warnings - these are mostly false positives in testing-library
    if (message.includes('inside a test was not wrapped in act(')) {
      return
    }

    // Suppress expected error logs from error handling code paths
    if (message.includes('Error loading') ||
        message.includes('Error creating') ||
        message.includes('Statement creation complete') ||
        message.includes('Statement uploaded to IPFS') ||
        message.includes('Statement signed') ||
        message.includes('Created statements list updated')) {
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

// Restore console methods after tests
afterAll(() => {
  console.error = originalConsoleError
  console.log = originalConsoleLog
  console.warn = originalConsoleWarn
})
