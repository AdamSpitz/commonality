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
        name: /you are not alone/i,
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
    expect(screen.getByRole('link', { name: /developer docs/i })).toHaveAttribute('href', '/docs')
    expect(screen.getByRole('link', { name: /open tally/i })).toHaveAttribute('href', '#')
  })

  it('renders Conceptspace developer docs at /docs/conceptspace', async () => {
    renderDomainRoute('conceptspace', '/docs/conceptspace')

    expect(
      await screen.findByRole(
        'heading',
        {
          name: /conceptspace developer docs/i,
        },
        { timeout: 5000 },
      )
    ).toBeInTheDocument()
    expect(screen.getByText(/generated TypeScript SDK reference/i)).toBeInTheDocument()
  })

  it('renders the Content Funding about page at /about', async () => {
    renderDomainRoute('content-funding', '/about')

    expect(
      await screen.findByRole(
        'heading',
        {
          name: /about content funding/i,
        },
        { timeout: 5000 },
      )
    ).toBeInTheDocument()
    expect(screen.getByText(/readers reward articles, videos, posts, and channels/i)).toBeInTheDocument()
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
    expect(screen.getByText(/The point is not bland centrism/i)).toBeInTheDocument()
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
    expect(screen.getByText(/two million people independently wrote versions/i)).toBeInTheDocument()
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
