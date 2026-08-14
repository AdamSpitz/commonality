import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMonthlyPledgedByCauseForToken } from '@commonality/sdk/delegation'
import { MonthlyPledgeSignal } from './MonthlyPledgeSignal'

const machinery = {
  contractAddresses: { recurringPledges: '0x1111111111111111111111111111111111111111' },
} as any

vi.mock('@commonality/sdk/delegation', async () => {
  const actual = await vi.importActual('@commonality/sdk/delegation')
  return { ...actual, getMonthlyPledgedByCauseForToken: vi.fn() }
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

describe('MonthlyPledgeSignal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sums monthly pledges across unique cause statements and labels them honestly', async () => {
    vi.mocked(getMonthlyPledgedByCauseForToken).mockResolvedValue(new Map([
      ['plank-a', 1_500_000n],
      ['plank-b', 2_000_000n],
    ]))

    render(<MonthlyPledgeSignal statementCids={['plank-a', 'plank-b', 'plank-a']} />)

    await waitFor(() => expect(screen.getByText('3.5 USDC/month')).toBeInTheDocument())
    expect(screen.getByText(/revocable auto-pull pledges/i)).toBeInTheDocument()
    expect(screen.getByText(/not guaranteed funding/i)).toBeInTheDocument()
  })

  it('does not render when recurring pledges are unavailable', () => {
    const address = machinery.contractAddresses.recurringPledges
    machinery.contractAddresses.recurringPledges = undefined
    const { container } = render(<MonthlyPledgeSignal statementCids={['plank-a']} />)
    expect(container).toBeEmptyDOMElement()
    machinery.contractAddresses.recurringPledges = address
  })
})
