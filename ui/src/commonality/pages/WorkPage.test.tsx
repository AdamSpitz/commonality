import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { WorkPage } from './WorkPage'

vi.mock('../hooks/useUserProjects', () => ({
  useUserProjects: () => ({ projects: [], loading: false, connected: true }),
}))

describe('WorkPage', () => {
  it('labels the page as the Work workspace with create and bookmark lists', () => {
    render(
      <MemoryRouter>
        <WorkPage />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('work-workspace')).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByTestId('work-created-projects')).toBeInTheDocument()
    expect(screen.getByTestId('work-bookmarked-projects')).toBeInTheDocument()
    expect(screen.getByTestId('home-create-project')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Fund' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Go to Organize' })).toHaveAttribute('href', '/causes')
  })
})
