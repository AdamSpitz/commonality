import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getStandingPledges } from '@commonality/sdk/delegation'
import { useCauseMonthlyPledges } from './useCauseMonthlyPledges'

const machinery = {
  contractAddresses: { recurringPledges: '0x1111111111111111111111111111111111111111' },
} as any

const account = { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}` | undefined }

vi.mock('@commonality/sdk/delegation', async () => {
  const actual = await vi.importActual('@commonality/sdk/delegation')
  return { ...actual, getStandingPledges: vi.fn() }
})

vi.mock('../lib/useMachinery', () => ({
  useMachinery: () => machinery,
}))

vi.mock('../lib/runtimeConfig', () => ({
  getRuntimeConfig: () => ({
    VITE_PAYMENT_TOKEN_SYMBOL: 'USDC',
    VITE_PAYMENT_TOKEN_DECIMALS: '6',
    VITE_PAYMENT_TOKEN_ADDRESS: '0x2222222222222222222222222222222222222222',
  }),
}))

vi.mock('wagmi', () => ({
  useAccount: () => account,
}))

function pledge(partial: { causeRef: string; amount: bigint; owner?: string; token?: string; active?: boolean }) {
  return {
    id: Math.random().toString(),
    contractAddress: '0x1111111111111111111111111111111111111111',
    rootOwner: partial.owner ?? '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    delegateTo: '0xcccccccccccccccccccccccccccccccccccccccc',
    token: partial.token ?? '0x2222222222222222222222222222222222222222',
    amountPerPeriod: partial.amount.toString(),
    period: '2592000',
    causeRef: partial.causeRef,
    backingType: 0,
    lastExecuted: '0',
    active: partial.active ?? true,
    createdAt: '0',
    createdAtBlock: '0',
    updatedAt: '0',
    executedNoteIds: [],
  }
}

describe('useCauseMonthlyPledges', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    account.address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    machinery.contractAddresses.recurringPledges = '0x1111111111111111111111111111111111111111'
  })

  it('sums overall and personal monthly pledges across unique cause statements', async () => {
    vi.mocked(getStandingPledges).mockResolvedValue([
      pledge({ causeRef: 'plank-a', amount: 1_500_000n }),
      pledge({ causeRef: 'plank-b', amount: 2_000_000n }),
      pledge({
        causeRef: 'plank-a',
        amount: 500_000n,
        owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }),
    ])

    const { result } = renderHook(() => useCauseMonthlyPledges(['plank-a', 'plank-b', 'plank-a']))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.totalMonthly).toBe(4_000_000n)
    expect(result.current.personalMonthly).toBe(500_000n)
    expect(result.current.byPlankCid.get('plank-a')).toBe(2_000_000n)
    expect(result.current.symbol).toBe('USDC')
    expect(result.current.available).toBe(true)
  })

  it('treats pledges as unavailable when recurring pledges are not configured', () => {
    machinery.contractAddresses.recurringPledges = undefined
    const { result } = renderHook(() => useCauseMonthlyPledges(['plank-a']))
    expect(result.current.available).toBe(false)
    expect(getStandingPledges).not.toHaveBeenCalled()
  })
})
