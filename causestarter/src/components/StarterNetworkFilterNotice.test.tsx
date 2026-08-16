import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StarterNetworkFilterNotice } from './StarterNetworkFilterNotice'

const useTrustedSet = vi.fn()

vi.mock('@ui/shared', () => ({
  useTrustedSet: (...args: unknown[]) => useTrustedSet(...args),
}))

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
}))

vi.mock('../lib/runtimeConfig', () => ({
  getRuntimeConfigValue: () => '0xstarter',
}))

afterEach(() => {
  cleanup()
  useTrustedSet.mockReset()
})

describe('StarterNetworkFilterNotice', () => {
  it('explains starter-network filtering when the visitor has no personal trust set', () => {
    useTrustedSet.mockImplementation((root?: string) => {
      if (root === '0xstarter') {
        return { trustedSet: new Set(['0xstarter']), isLoading: false }
      }
      return { trustedSet: undefined, isLoading: false }
    })

    render(
      <MemoryRouter>
        <StarterNetworkFilterNotice />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('starter-network-filter-notice')).toHaveTextContent(
      /CauseStarter's starter network/i,
    )
    expect(screen.getByRole('link', { name: /trust settings/i })).toHaveAttribute(
      'href',
      '/settings',
    )
  })

  it('hides when the visitor has a personal trust set', () => {
    useTrustedSet.mockImplementation((root?: string) => {
      if (root === '0xstarter') {
        return { trustedSet: new Set(['0xstarter']), isLoading: false }
      }
      return { trustedSet: new Set(['0xme']), isLoading: false }
    })

    render(
      <MemoryRouter>
        <StarterNetworkFilterNotice />
      </MemoryRouter>,
    )

    expect(screen.queryByTestId('starter-network-filter-notice')).toBeNull()
  })
})
