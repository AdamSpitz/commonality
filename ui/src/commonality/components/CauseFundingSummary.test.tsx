import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { CauseFundingSummary } from './CauseFundingSummary'

const pledges = {
  loading: false,
  available: true,
  symbol: 'USDC',
  decimals: 6,
  connected: true,
  totalMonthly: 3_500_000n,
  personalMonthly: 1_000_000n,
  byPlankCid: new Map(),
}

vi.mock('../hooks/useCauseMonthlyPledges', () => ({
  useCauseMonthlyPledges: () => pledges,
}))

vi.mock('../../shared/components/WalletButton', () => ({
  WalletButton: () => <button type="button">Connect</button>,
}))

describe('CauseFundingSummary', () => {
  it('shows overall and personal monthly totals and links to the funding page', () => {
    render(
      <MemoryRouter>
        <CauseFundingSummary statementCids={['plank-a']} href="/cause/demo/funding" />
      </MemoryRouter>,
    )

    expect(screen.getByText('3.5 USDC/month pledged')).toBeInTheDocument()
    expect(screen.getByText('You: 1 USDC/month')).toBeInTheDocument()
    expect(screen.getByTestId('cause-funding-summary')).toHaveAttribute('href', '/cause/demo/funding')
    expect(screen.queryByTestId('earmark-help')).not.toBeInTheDocument()
  })

  it('uses the compact connect hint when the wallet is disconnected', () => {
    pledges.connected = false
    render(
      <MemoryRouter>
        <CauseFundingSummary statementCids={['plank-a']} href="/cause/demo/funding" />
      </MemoryRouter>,
    )

    expect(screen.getByText('Connect a wallet to see your pledge.')).toBeInTheDocument()
    expect(screen.getByTestId('connect-wallet-hint')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
    pledges.connected = true
  })

  it('renders without a funding-page link when href is omitted', () => {
    cleanup()
    render(
      <MemoryRouter>
        <CauseFundingSummary statementCids={['plank-a']} />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('cause-funding-summary').tagName).toBe('DIV')
    expect(screen.getByText('Pledges')).toBeInTheDocument()
  })
})
