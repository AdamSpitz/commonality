import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LazyGivingLandingPage } from './LandingPage'

function renderLanding() {
  return render(
    <MemoryRouter>
      <LazyGivingLandingPage />
    </MemoryRouter>,
  )
}

describe('LazyGivingLandingPage', () => {
  it('links the core project actions from the landing page', () => {
    renderLanding()

    expect(screen.getByRole('heading', { name: /crowdfunding without the two annoying jobs/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse projects/i })).toHaveAttribute('href', '/projects')
    expect(screen.getByRole('link', { name: /create a project/i })).toHaveAttribute('href', '/projects/new')
  })

  it('explains and links the assurance, retroactive funding, and delegation concepts', () => {
    renderLanding()

    expect(screen.getByText(/If the goal is reached, the project proceeds/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /how assurance contracts work/i })).toHaveAttribute('href', '/docs/key-ideas/assurance-contracts')

    expect(screen.getByText(/with retroactive funding, you don't have to be/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /more on retroactive funding/i })).toHaveAttribute('href', '/docs/key-ideas/retroactive-funding')

    expect(screen.getByText(/delegate your funding decisions/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /more on delegation/i })).toHaveAttribute('href', '/docs/key-ideas/delegation')
  })
})
