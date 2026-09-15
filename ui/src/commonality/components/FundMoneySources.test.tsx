import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FundMoneySources } from './FundMoneySources'

const { getNotesByOwner, useAccount, machinery } = vi.hoisted(() => ({
  getNotesByOwner: vi.fn(),
  useAccount: vi.fn(),
  machinery: {},
}))

vi.mock('wagmi', () => ({ useAccount }))
vi.mock('@commonality/sdk/delegation', () => ({ getNotesByOwner }))
vi.mock('@ui/shared', () => ({
  useMachinery: () => machinery,
  getCurrencyForNote: () => ({ symbol: 'ETH', decimals: 18 }),
  formatCurrencyAmount: () => '1 ETH',
  truncateAddress: (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`,
}))

const note = (overrides: Record<string, unknown> = {}) => ({
  id: '1', chainHash: '0xabc', amount: '1000000000000000000',
  token: '0x0000000000000000000000000000000000000000', tokenType: 0, tokenId: '0',
  owner: '0x1111111111111111111111111111111111111111',
  rootOwner: '0x1111111111111111111111111111111111111111', active: true,
  contractAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  createdAt: '1', createdAtBlock: '1', updatedAt: '1', ...overrides,
})

describe('FundMoneySources', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    useAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111' })
  })

  it('stores a board-level preferred fund', async () => {
    window.localStorage.setItem(
      'causestarter.personal-funding-board.v1:0x1111111111111111111111111111111111111111',
      JSON.stringify({ version: 1, statementCids: ['bafy1'] }),
    )
    getNotesByOwner.mockResolvedValue([note()])
    render(<MemoryRouter><FundMoneySources /></MemoryRouter>)

    fireEvent.click(await screen.findByText('1 active fund'))
    fireEvent.click(await screen.findByRole('button', { name: 'Use by default' }))

    expect(screen.getByRole('button', { name: 'Preferred' })).toBeDisabled()
    expect(JSON.parse(window.localStorage.getItem(
      'causestarter.personal-funding-board.v1:0x1111111111111111111111111111111111111111',
    )!)).toMatchObject({
      preferredMoneySource: {
        noteContract: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        noteId: '1',
      },
    })
  })

  it('shows active personal and entrusted funds in Fund', async () => {
    getNotesByOwner.mockResolvedValue([
      note(),
      note({ id: '2', rootOwner: '0x2222222222222222222222222222222222222222' }),
      note({ id: '3', active: false }),
    ])
    render(<MemoryRouter><FundMoneySources /></MemoryRouter>)

    await waitFor(() => expect(screen.getByText('2 active funds')).toBeInTheDocument())
    expect(screen.getByText('1 entrusted to you')).toBeInTheDocument()
    expect(screen.queryByText(/Fund #1/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('2 active funds'))
    expect(screen.getByText(/Fund #1.*Your fund/)).toBeInTheDocument()
    expect(screen.getByText(/Fund #2.*Entrusted by/)).toBeInTheDocument()
    expect(screen.queryByText(/Fund #3/)).not.toBeInTheDocument()
  })

  it('stays out of the workspace until a wallet is connected', () => {
    useAccount.mockReturnValue({ address: undefined })
    render(<MemoryRouter><FundMoneySources /></MemoryRouter>)
    expect(screen.queryByTestId('fund-money-sources')).not.toBeInTheDocument()
    expect(getNotesByOwner).not.toHaveBeenCalled()
  })
})
