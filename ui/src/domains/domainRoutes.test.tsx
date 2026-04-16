import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { getDomainManifest } from './index'

function renderDomainHome(domainId: 'commonality' | 'content-funding' | 'noninflammatory' | 'movement') {
  const manifest = getDomainManifest(domainId)
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>{manifest.routes}</Routes>
    </MemoryRouter>
  )
}

describe('domain manifest home routes', () => {
  it('renders the Commonality landing page at the root route', () => {
    renderDomainHome('commonality')

    expect(
      screen.getByRole('heading', {
        name: /find common ground first, then fund the work that follows from it/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /start with docs/i })).toHaveAttribute('href', '/docs')
  })

  it('renders the Content Funding landing page at the root route', () => {
    renderDomainHome('content-funding')

    expect(
      screen.getByRole('heading', {
        name: /fund the content you want more of/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse content/i })).toHaveAttribute('href', '/content')
  })

  it('renders the Noninflammatory landing page at the root route', () => {
    renderDomainHome('noninflammatory')

    expect(
      screen.getByRole('heading', {
        name: /reward content that lowers the temperature instead of raising it/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /about the thesis/i })).toHaveAttribute('href', '/about')
  })

  it('renders the Movement landing page at the root route', () => {
    renderDomainHome('movement')

    expect(
      screen.getByRole('heading', {
        name: /organize the hidden majority around positions that already have broad support/i,
      })
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: /browse projects/i }).some((link) => link.getAttribute('href') === '/projects')
    ).toBe(true)
  })
})
