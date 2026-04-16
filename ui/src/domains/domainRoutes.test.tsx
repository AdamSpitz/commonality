import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { getDomainManifest } from './index'

function renderDomainRoute(
  domainId: 'commonality' | 'content-funding' | 'noninflammatory' | 'movement',
  path = '/',
) {
  const manifest = getDomainManifest(domainId)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{manifest.routes}</Routes>
    </MemoryRouter>
  )
}

describe('domain manifest home routes', () => {
  it('renders the Commonality landing page at the root route', () => {
    renderDomainRoute('commonality')

    expect(
      screen.getByRole('heading', {
        name: /find common ground first, then fund the work that follows from it/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /start with docs/i })).toHaveAttribute('href', '/docs')
  })

  it('renders the Content Funding landing page at the root route', () => {
    renderDomainRoute('content-funding')

    expect(
      screen.getByRole('heading', {
        name: /fund the content you want more of/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse content/i })).toHaveAttribute('href', '/content')
  })

  it('renders the Noninflammatory landing page at the root route', () => {
    renderDomainRoute('noninflammatory')

    expect(
      screen.getByRole('heading', {
        name: /reward content that lowers the temperature instead of raising it/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /about the thesis/i })).toHaveAttribute('href', '/about')
  })

  it('renders the Movement landing page at the root route', () => {
    renderDomainRoute('movement')

    expect(
      screen.getByRole('heading', {
        name: /organize the hidden majority around positions that already have broad support/i,
      })
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: /open organizing playbook/i }).some((link) => link.getAttribute('href') === '/organize')
    ).toBe(true)
  })

  it('renders the Noninflammatory about page at /about', () => {
    renderDomainRoute('noninflammatory', '/about')

    expect(
      screen.getByRole('heading', {
        name: /about noninflammatory content/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByText(/the point of this domain is not bland centrism/i)).toBeInTheDocument()
  })

  it('renders the Movement about page at /about', () => {
    renderDomainRoute('movement', '/about')

    expect(
      screen.getByRole('heading', {
        name: /about common sense majority/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByText(/movement layer in the multiple-domain ui plan/i)).toBeInTheDocument()
  })

  it('renders the organizing playbook at /organize', () => {
    renderDomainRoute('movement', '/organize')

    expect(
      screen.getByRole('heading', {
        name: /turn bridge-building content into visible, fundable political coordination/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse organizing projects/i })).toHaveAttribute('href', '/projects')
  })
})
