import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PersonalDashboardPage } from './PersonalDashboardPage'

vi.mock('../components/YourDashboard', () => ({
  YourDashboard: () => <div data-testid="personal-dashboard-page" />,
}))

vi.mock('../components/FundMoneySources', () => ({
  FundMoneySources: () => <div data-testid="fund-money-sources" />,
}))

vi.mock('../hooks/useUserProjects', () => ({
  useUserProjects: () => ({ projects: [], loading: false, connected: true }),
}))

describe('PersonalDashboardPage', () => {
  it('labels the page as the Fund workspace', () => {
    render(
      <MemoryRouter>
        <PersonalDashboardPage />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('fund-workspace')).toBeInTheDocument()
    expect(screen.getByText('Fund')).toBeInTheDocument()
    expect(screen.getByTestId('fund-money-sources')).toBeInTheDocument()
    expect(screen.getByTestId('personal-dashboard-page')).toBeInTheDocument()
    expect(screen.getByTestId('fund-bookmarked-projects')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Work' })).toHaveAttribute('href', '/work')
  })
})

