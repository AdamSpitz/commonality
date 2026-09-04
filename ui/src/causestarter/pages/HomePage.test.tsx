import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'

const mocks = vi.hoisted(() => ({
  useAccount: vi.fn(),
  useUserCauses: vi.fn(),
  useUserProjects: vi.fn(),
  useUserStatements: vi.fn(),
  useDonationSummary: vi.fn(),
}))

vi.mock('wagmi', () => ({ useAccount: mocks.useAccount }))
vi.mock('../hooks/useUserCauses', () => ({ useUserCauses: mocks.useUserCauses }))
vi.mock('../hooks/useUserProjects', () => ({ useUserProjects: mocks.useUserProjects }))
vi.mock('../hooks/useUserStatements', () => ({ useUserStatements: mocks.useUserStatements }))
vi.mock('../hooks/useDonationSummary', () => ({ useDonationSummary: mocks.useDonationSummary }))

function renderHome({ connected = false, statements = 0, pledges = 0, notes = 0 } = {}) {
  mocks.useAccount.mockReturnValue({ isConnected: connected, address: connected ? '0xabc' : undefined })
  mocks.useUserCauses.mockReturnValue({ causes: [], loading: false })
  mocks.useUserProjects.mockReturnValue({ projects: [], loading: false })
  mocks.useUserStatements.mockReturnValue({ statements: Array.from({ length: statements }, (_, index) => ({ cid: `cid-${index}` })), loading: false })
  mocks.useDonationSummary.mockReturnValue({ activePledgeCount: pledges, activeNoteCount: notes, delegatedNoteCount: notes, loading: false })
  render(<MemoryRouter><HomePage /></MemoryRouter>)
}

describe('HomePage role launcher', () => {
  afterEach(cleanup)

  it('gives every visitor the focused role cards', () => {
    renderHome()
    expect(screen.getByRole('heading', { name: 'What would you like to do?' })).toBeInTheDocument()
    expect(screen.getByTestId('home-role-sign')).toHaveAttribute('href', '/statements')
    expect(screen.getByTestId('home-role-donate')).toHaveAttribute('href', '/donate')
    expect(screen.getByTestId('home-role-fund')).toHaveAttribute('href', '/dashboard')
    expect(screen.getByTestId('home-role-work')).toHaveAttribute('href', '/work')
    expect(screen.getByTestId('home-role-organize')).toHaveAttribute('href', '/causes')
    expect(screen.getByText('Signing does not commit money.', { exact: false })).toBeInTheDocument()
  })

  it('replaces blurbs with compact activity summaries', () => {
    renderHome({ connected: true, statements: 3, pledges: 1, notes: 2 })
    expect(screen.getByText('3 signed statements')).toBeInTheDocument()
    expect(screen.getByText('1 monthly pledge · 2 active funds')).toBeInTheDocument()
    expect(screen.getByText('Set the scope of your personal funding board.')).toBeInTheDocument()
  })
})
