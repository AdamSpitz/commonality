import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTrustedSet } from './useTrustedSet'
import { SUBJECTIV_TRUST_NETWORK_INVALIDATED_EVENT } from '../subjectivTrust'
import {
  loadCachedSubjectivTrustedSet,
  saveCachedSubjectivTrustedSet,
} from '../subjectivTrustCache'
import { computeSubjectivTrustedSet } from '../subjectivTrustWorkerClient'

const mockMachinery = {
  eventCacheUrl: 'http://localhost:42069/api',
  contractAddresses: {
    trustRegistry: '0x1234567890abcdef1234567890abcdef12345678',
  },
} as any

vi.mock('./useMachinery', () => ({
  useMachinery: () => mockMachinery,
}))

vi.mock('../subjectivTrustWorkerClient', () => ({
  computeSubjectivTrustedSet: vi.fn(),
}))

vi.mock('../subjectivTrustCache', () => ({
  loadCachedSubjectivTrustedSet: vi.fn(),
  saveCachedSubjectivTrustedSet: vi.fn(),
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

describe('useTrustedSet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    vi.mocked(loadCachedSubjectivTrustedSet).mockResolvedValue(null)
    vi.mocked(saveCachedSubjectivTrustedSet).mockResolvedValue(undefined)
  })

  it('supports manual refreshes', async () => {
    vi.mocked(computeSubjectivTrustedSet)
      .mockResolvedValueOnce({
        hasDirectTrust: true,
        trustedSet: ['0x1111111111111111111111111111111111111111'],
      })
      .mockResolvedValueOnce({
        hasDirectTrust: true,
        trustedSet: ['0x2222222222222222222222222222222222222222'],
      })

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
    vi.mocked(computeSubjectivTrustedSet)
      .mockResolvedValueOnce({
        hasDirectTrust: true,
        trustedSet: ['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
      })
      .mockResolvedValueOnce({
        hasDirectTrust: true,
        trustedSet: ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
      })

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
    vi.mocked(computeSubjectivTrustedSet)
      .mockResolvedValueOnce({
        hasDirectTrust: true,
        trustedSet: ['0x3333333333333333333333333333333333333333'],
      })
      .mockResolvedValueOnce({
        hasDirectTrust: true,
        trustedSet: ['0x4444444444444444444444444444444444444444'],
      })
      .mockResolvedValue({
        hasDirectTrust: true,
        trustedSet: ['0x4444444444444444444444444444444444444444'],
      })

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

  it('falls back to showing no trusted set when the user has no direct trust declarations', async () => {
    vi.mocked(computeSubjectivTrustedSet).mockResolvedValue({
      hasDirectTrust: false,
      trustedSet: [],
    })

    render(<TrustedSetProbe />)

    await waitFor(() => {
      expect(screen.getByTestId('trusted-set')).toHaveTextContent('none')
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
  })

  it('rehydrates a cached trusted set before the fresh recomputation finishes', async () => {
    let resolveFreshResult: ((value: { hasDirectTrust: true; trustedSet: string[] }) => void) | undefined
    vi.mocked(loadCachedSubjectivTrustedSet).mockResolvedValue({
      hasDirectTrust: true,
      trustedSet: ['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
    })
    vi.mocked(computeSubjectivTrustedSet).mockImplementation(
      () =>
        new Promise(resolve => {
          resolveFreshResult = resolve
        })
    )

    render(<TrustedSetProbe />)

    await waitFor(() => {
      expect(screen.getByTestId('trusted-set')).toHaveTextContent('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    resolveFreshResult?.({
      hasDirectTrust: true,
      trustedSet: ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
    })

    await waitFor(() => {
      expect(screen.getByTestId('trusted-set')).toHaveTextContent('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')
    })

    expect(saveCachedSubjectivTrustedSet).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      }),
      {
        hasDirectTrust: true,
        trustedSet: ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
      }
    )
  })

  it('keeps the cached trusted set visible if the refresh fails', async () => {
    vi.mocked(loadCachedSubjectivTrustedSet).mockResolvedValue({
      hasDirectTrust: true,
      trustedSet: ['0xcccccccccccccccccccccccccccccccccccccccc'],
    })
    vi.mocked(computeSubjectivTrustedSet).mockRejectedValue(new Error('worker exploded'))

    render(<TrustedSetProbe />)

    await waitFor(() => {
      expect(screen.getByTestId('trusted-set')).toHaveTextContent('0xcccccccccccccccccccccccccccccccccccccccc')
      expect(screen.getByTestId('error')).toHaveTextContent('worker exploded')
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
  })
})
