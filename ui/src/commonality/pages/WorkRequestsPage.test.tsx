import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { WorkRequestsPage } from './WorkRequestsPage'

vi.mock('../hooks/useWorkRequests', () => ({
  useWorkRequests: () => ({
    loading: false,
    error: null,
    reload: () => undefined,
    board: {
      requests: [{
        actor: '0xabc',
        slug: 'cedarvale-playground',
        current: { body: { outcome: 'An accessible playground in Cedarvale Park' } },
        versions: [{}, {}],
      }],
      offers: [],
      responses: [],
      acceptances: [],
      decisions: [],
      contributionLinks: [],
      backing: [],
    },
  }),
}))

describe('WorkRequestsPage', () => {
  it('lists a request for work and links to its page', () => {
    render(
      <MemoryRouter>
        <WorkRequestsPage />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('work-requests')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'An accessible playground in Cedarvale Park' }))
      .toHaveAttribute('href', '/work/requests/0xabc/cedarvale-playground')
  })
})
