import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ConceptspaceLandingPage } from './LandingPage'

function renderLanding() {
  return render(
    <MemoryRouter>
      <ConceptspaceLandingPage />
    </MemoryRouter>,
  )
}

describe('ConceptspaceLandingPage', () => {
  it('makes developer docs, API docs, and trust model docs discoverable from the landing page', () => {
    renderLanding()

    expect(screen.getByRole('heading', { name: /make concepts linkable/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /read the developer docs/i })).toHaveAttribute('href', '/docs/conceptspace')
    expect(screen.getByRole('link', { name: /api and sdk docs/i })).toHaveAttribute('href', '/docs/conceptspace#api-and-contract-reference')
    expect(screen.getByRole('link', { name: /trust model docs/i })).toHaveAttribute('href', '/docs/conceptspace#what-to-build-on')
  })

  it('keeps the service repository links visible for operators', () => {
    renderLanding()

    expect(screen.getByRole('link', { name: /attester github repo/i })).toHaveAttribute('href', expect.stringContaining('/implication-attester'))
    expect(screen.getByRole('link', { name: /finder github repo/i })).toHaveAttribute('href', expect.stringContaining('/implication-finder'))
    expect(screen.getByRole('link', { name: /sample nudger github repo/i })).toHaveAttribute('href', expect.stringContaining('/implication-graph-nudger'))
  })
})
