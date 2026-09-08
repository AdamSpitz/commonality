import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ProfilePage } from './ProfilePage'

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: '0xabc', isConnected: true }),
}))

vi.mock('../../shared', () => ({
  AddressDisplay: ({ address }: { address: string }) => <div>{address}</div>,
}))

vi.mock('../hooks/useDonationSummary', () => ({
  useDonationSummary: () => ({
    activePledgeCount: 1,
    activeNoteCount: 2,
    delegatedNoteCount: 0,
    loading: false,
  }),
}))

vi.mock('../hooks/useUserProjects', () => ({
  useUserProjects: () => ({ projects: [], loading: false, connected: true }),
}))

vi.mock('../hooks/useUserStatements', () => ({
  useUserStatements: () => ({ statements: [], loading: false, error: null }),
}))

vi.mock('../hooks/useUserCauses', () => ({
  useUserCauses: () => ({ causes: [], loading: false }),
}))

vi.mock('../hooks/useUserAlignments', () => ({
  useUserAlignments: () => ({ attestations: [], loading: false, error: null, refresh: () => undefined }),
}))

vi.mock('../components/YourProjects', () => ({
  YourProjects: ({ testId, heading }: { testId: string; heading: string }) => (
    <div data-testid={testId}>{heading}</div>
  ),
}))

vi.mock('../components/CauseCard', () => ({
  CauseCard: () => null,
}))

vi.mock('../components/ConnectWalletHint', () => ({
  ConnectWalletHint: ({ children }: { children: string }) => <div>{children}</div>,
}))

describe('ProfilePage', () => {
  it('is a record of past activity, not a workspace for next actions', () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('profile-page')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Stuff you’ve done' })).toBeInTheDocument()
    expect(screen.getByTestId('profile-giving')).toBeInTheDocument()
    expect(screen.getByText('1 monthly pledge · 2 active funds')).toBeInTheDocument()
    expect(screen.getByTestId('profile-contributed-projects')).toBeInTheDocument()
    expect(screen.getByTestId('profile-created-projects')).toBeInTheDocument()
    expect(screen.getByTestId('profile-causes')).toBeInTheDocument()
    expect(screen.getByTestId('profile-statements')).toBeInTheDocument()
    expect(screen.getByTestId('profile-alignments')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Donate' })).toHaveAttribute('href', '/donate')
    expect(screen.getByRole('link', { name: 'Open Organize' })).toHaveAttribute('href', '/causes')
    expect(screen.getByRole('link', { name: 'Open Sign' })).toHaveAttribute('href', '/statements')
  })
})
