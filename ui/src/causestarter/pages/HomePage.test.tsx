import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'

const { useUserCauses, useAccount } = vi.hoisted(() => ({
  useUserCauses: vi.fn(),
  useAccount: vi.fn(),
}))

vi.mock('../hooks/useUserCauses', () => ({
  useUserCauses,
}))

vi.mock('wagmi', () => ({
  useAccount,
}))

vi.mock('../components/YourDashboard', () => ({
  YourDashboard: () => <div data-testid="home-dashboard-board" />,
}))

vi.mock('../components/YourProjects', () => ({
  YourProjects: () => null,
}))

vi.mock('../components/YourSignedStatements', () => ({
  YourSignedStatements: () => null,
}))

vi.mock('../components/YourNudgersAndNudges', () => ({
  YourNudgersAndNudges: () => null,
}))

describe('HomePage landing', () => {
  afterEach(cleanup)

  it('leads with jobs, not Start → Grow → Deliver', () => {
    useUserCauses.mockReturnValue({ causes: [], loading: false })
    useAccount.mockReturnValue({ isConnected: false })
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('home-landing')).toBeInTheDocument()
    expect(screen.getByText(/there are enough of us/i)).toBeInTheDocument()
    expect(screen.getByTestId('crowd-jobs')).toBeInTheDocument()
    expect(screen.queryByText(/change the world/i)).toBeNull()
    expect(screen.queryByTestId('home-dashboard-board')).toBeNull()
  })

  it('puts the personal fundable-projects board first when the wallet is connected', () => {
    useUserCauses.mockReturnValue({ causes: [], loading: false })
    useAccount.mockReturnValue({ isConnected: true, address: '0xabc' })
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('home-dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('home-dashboard-board')).toBeInTheDocument()
    expect(screen.queryByTestId('home-landing')).toBeNull()
  })
})
