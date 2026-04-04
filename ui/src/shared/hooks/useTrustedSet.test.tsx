import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDirectTrustMapping, getTrustedSet } from '@commonality/sdk'
import { useTrustedSet } from './useTrustedSet'
import { SUBJECTIV_TRUST_NETWORK_INVALIDATED_EVENT } from '../subjectivTrust'

const mockMachinery = {
  eventCacheUrl: 'http://localhost:42069/api',
  contractAddresses: {
    trustRegistry: '0x1234567890abcdef1234567890abcdef12345678',
  },
} as any

vi.mock('@commonality/sdk', () => ({
  getDirectTrustMapping: vi.fn(),
  getTrustedSet: vi.fn(),
}))

vi.mock('./useMachinery', () => ({
  useMachinery: () => mockMachinery,
}))

function TrustedSetProbe({
  address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  refreshIntervalMs,
}: {
  address?: string
  refreshIntervalMs?: number
}) {
  const { trustedSet, isLoading, error, refreshTrustedSet } = useTrustedSet(address, { refreshIntervalMs })

  return (
    <div>
      <div data-testid="trusted-set">
        {trustedSet ? Array.from(trustedSet).sort().join(',') : 'none'}
      </div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="error">{error ?? ''}</div>
      <button onClick={refreshTrustedSet}>Refresh</button>
    </div>
  )
}

function makeDirectTrustMapping() {
  return new Map([['0xfeedfeedfeedfeedfeedfeedfeedfeedfeedfeed', 100]])
}

describe('useTrustedSet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    vi.mocked(getDirectTrustMapping).mockResolvedValue(makeDirectTrustMapping())
  })

  it('supports manual refreshes', async () => {
    vi.mocked(getTrustedSet)
      .mockResolvedValueOnce(new Set(['0x1111111111111111111111111111111111111111']))
      .mockResolvedValueOnce(new Set(['0x2222222222222222222222222222222222222222']))

    const user = userEvent.setup()
    render(<TrustedSetProbe />)

    await waitFor(() => {
      expect(screen.getByTestId('trusted-set')).toHaveTextContent('0x1111111111111111111111111111111111111111')
    })

    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    await waitFor(() => {
      expect(screen.getByTestId('trusted-set')).toHaveTextContent('0x2222222222222222222222222222222222222222')
    })
  })

  it('recomputes when the trust network is invalidated elsewhere in the UI', async () => {
    vi.mocked(getTrustedSet)
      .mockResolvedValueOnce(new Set(['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']))
      .mockResolvedValueOnce(new Set(['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb']))

    render(<TrustedSetProbe />)

    await waitFor(() => {
      expect(screen.getByTestId('trusted-set')).toHaveTextContent('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    })

    act(() => {
      window.dispatchEvent(new Event(SUBJECTIV_TRUST_NETWORK_INVALIDATED_EVENT))
    })

    await waitFor(() => {
      expect(screen.getByTestId('trusted-set')).toHaveTextContent('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')
    })
  })

  it('refreshes on an interval when configured', async () => {
    vi.mocked(getTrustedSet)
      .mockResolvedValueOnce(new Set(['0x3333333333333333333333333333333333333333']))
      .mockResolvedValueOnce(new Set(['0x4444444444444444444444444444444444444444']))
      .mockResolvedValue(new Set(['0x4444444444444444444444444444444444444444']))

    render(<TrustedSetProbe refreshIntervalMs={25} />)

    await waitFor(() => {
      expect(screen.getByTestId('trusted-set')).toHaveTextContent('0x3333333333333333333333333333333333333333')
    })

    await act(async () => {
      await new Promise(resolve => window.setTimeout(resolve, 40))
    })

    await waitFor(() => {
      expect(screen.getByTestId('trusted-set')).toHaveTextContent('0x4444444444444444444444444444444444444444')
    })
  })
})
