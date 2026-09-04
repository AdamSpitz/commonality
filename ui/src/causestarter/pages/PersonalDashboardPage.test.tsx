import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PersonalDashboardPage } from './PersonalDashboardPage'

vi.mock('../components/YourDashboard', () => ({
  YourDashboard: () => <div data-testid="personal-dashboard-page" />,
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
    expect(screen.getByTestId('personal-dashboard-page')).toBeInTheDocument()
  })
})
