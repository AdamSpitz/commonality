import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { YourProjects } from './YourProjects'
import type { UserProject } from '../lib/userProjects'

const sample = (n: number): UserProject => ({
  title: `Project ${n}`,
  relations: ['created'],
  project: {
    id: `0x${String(n).padStart(40, '0')}`,
    totalReceived: '0',
    threshold: '100',
    deadline: '9999999999',
  } as UserProject['project'],
})

describe('YourProjects', () => {
  it('shows create and an empty connected state', () => {
    render(
      <MemoryRouter>
        <YourProjects
          heading="Your projects"
          empty="No projects yet."
          projects={[]}
          loading={false}
          connected
          showCreate
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Your projects' })).toBeInTheDocument()
    expect(screen.getByTestId('home-create-project')).toBeInTheDocument()
    expect(screen.getByText(/No projects yet/)).toBeInTheDocument()
  })

  it('caps the teaser instead of listing every project', () => {
    render(
      <MemoryRouter>
        <YourProjects
          compact
          heading="Your projects"
          empty=""
          projects={[1, 2, 3, 4].map(sample)}
          loading={false}
          connected
          mode="work"
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Project 1')).toBeInTheDocument()
    expect(screen.getByText('Project 3')).toBeInTheDocument()
    expect(screen.queryByText('Project 4')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute('href', '/work')
  })

  it('lists related projects with funding status and Owner, not Created', () => {
    render(
      <MemoryRouter>
        <YourProjects
          heading="Your projects"
          empty=""
          projects={[{
            title: 'Garden beds',
            relations: ['created', 'contributed'],
            project: {
              id: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
              totalReceived: '100',
              threshold: '100',
              deadline: '9999999999',
            } as UserProject['project'],
          }]}
          loading={false}
          connected
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Garden beds')).toBeInTheDocument()
    expect(screen.getByText('Succeeded')).toBeInTheDocument()
    expect(screen.getByText('Owner')).toBeInTheDocument()
    expect(screen.getByText('Contributed')).toBeInTheDocument()
    expect(screen.queryByText('Created')).not.toBeInTheDocument()
  })
})
