import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { YourProjects } from './YourProjects'

const { useUserProjects } = vi.hoisted(() => ({
  useUserProjects: vi.fn(),
}))

vi.mock('../hooks/useUserProjects', () => ({
  useUserProjects,
}))

vi.mock('./ConnectWalletHint', () => ({
  ConnectWalletHint: ({ children }: { children: string }) => <div>{children}</div>,
}))

describe('YourProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows create and an empty connected state', () => {
    useUserProjects.mockReturnValue({ projects: [], loading: false, connected: true })
    render(
      <MemoryRouter>
        <YourProjects />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Bookmarked projects' })).toBeInTheDocument()
    expect(screen.getByTestId('home-create-project')).toBeInTheDocument()
    expect(screen.getByText(/No projects yet/)).toBeInTheDocument()
  })

  it('lists related projects with funding status and Owner, not Created', () => {
    useUserProjects.mockReturnValue({
      connected: true,
      loading: false,
      projects: [{
        title: 'Garden beds',
        relations: ['created', 'contributed'],
        project: {
          id: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          totalReceived: '100',
          threshold: '100',
          deadline: '9999999999',
        },
      }],
    })
    render(
      <MemoryRouter>
        <YourProjects />
      </MemoryRouter>,
    )
    expect(screen.getByText('Garden beds')).toBeInTheDocument()
    expect(screen.getByText('Succeeded')).toBeInTheDocument()
    expect(screen.getByText('Owner')).toBeInTheDocument()
    expect(screen.getByText('Contributed')).toBeInTheDocument()
    expect(screen.queryByText('Created')).not.toBeInTheDocument()
  })
})
