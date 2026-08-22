import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'

vi.mock('../hooks/useUserCauses', () => ({
  useUserCauses: () => ({ causes: [], loading: false }),
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
  it('leads with jobs, not Start → Grow → Deliver', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('home-landing')).toBeInTheDocument()
    expect(screen.getByText(/there are enough of us/i)).toBeInTheDocument()
    expect(screen.getByTestId('crowd-jobs')).toBeInTheDocument()
    expect(screen.getByTestId('crowd-job-money')).toBeInTheDocument()
    expect(screen.queryByText(/change the world/i)).toBeNull()
  })
})

