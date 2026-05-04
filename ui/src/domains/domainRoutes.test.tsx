import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { getDomainManifest } from './index'

function renderDomainRoute(
  domainId: 'commonality' | 'tally' | 'content-funding' | 'noninflammatory' | 'csm' | 'conceptspace',
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
        name: /build the movement for better public-goods funding/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /start with the thesis/i })).toHaveAttribute('href', '/docs')
  })

  it('renders the Tally landing page at the root route', () => {
    renderDomainRoute('tally')

    expect(
      screen.getByRole('heading', {
        name: /petitions and polls with an implication graph/i,
      })
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: /start signing/i }).some((link) => link.getAttribute('href') === '/start')
    ).toBe(true)
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

  it('renders the CSM landing page at the root route', () => {
    renderDomainRoute('csm')

    expect(
      screen.getByRole('heading', {
        name: /organize the hidden majority around positions that already have broad support/i,
      })
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: /open organizing playbook/i }).some((link) => link.getAttribute('href') === '/organize')
    ).toBe(true)
  })

  it('renders the Conceptspace landing page at the root route', () => {
    renderDomainRoute('conceptspace')

    expect(
      screen.getByRole('heading', {
        name: /statement, implication, signing, and trust infrastructure/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open tally/i })).toHaveAttribute('href', '#')
  })

  it('renders the Noninflammatory about page at /about', async () => {
    renderDomainRoute('noninflammatory', '/about')

    expect(
      await screen.findByRole(
        'heading',
        {
          name: /about noninflammatory content/i,
        },
        { timeout: 5000 },
      )
    ).toBeInTheDocument()
    expect(screen.getByText(/the point of this domain is not bland centrism/i)).toBeInTheDocument()
  })

  it('renders the CSM about page at /about', async () => {
    renderDomainRoute('csm', '/about')

    expect(
      await screen.findByRole(
        'heading',
        {
          name: /about common sense majority/i,
        },
        { timeout: 5000 },
      )
    ).toBeInTheDocument()
    expect(screen.getByText(/movement layer in the multiple-domain ui plan/i)).toBeInTheDocument()
  })

  it('renders the organizing playbook at /organize', async () => {
    renderDomainRoute('csm', '/organize')

    expect(
      await screen.findByRole(
        'heading',
        {
          name: /turn bridge-building content into visible, fundable political coordination/i,
        },
        { timeout: 5000 },
      )
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse organizing projects/i })).toHaveAttribute('href', '/projects')
  })
})
