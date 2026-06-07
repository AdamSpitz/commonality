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
  it('makes the developer docs and API docs discoverable from the landing page', () => {
    renderLanding()

    expect(screen.getByRole('heading', { name: /make concepts linkable/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /read the developer docs/i })).toHaveAttribute('href', '/docs/conceptspace')
    expect(screen.getByRole('link', { name: /api and sdk docs/i })).toHaveAttribute('href', '/docs/conceptspace#api-and-contract-reference')
  })

  it('keeps the landing page focused: one primary CTA, no service-repo zoo', () => {
    renderLanding()

    // Repo links live in the docs now, not on the "deliberately boring" landing page.
    expect(screen.queryByRole('link', { name: /github repo/i })).not.toBeInTheDocument()
    expect(screen.getByText(/count concepts, not strings/i)).toBeInTheDocument()
  })
})
