import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { getDomainManifest } from './index'
import type { DomainId } from './types'

function renderDomainRoute(domainId: DomainId, path = '/') {
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
        name: /a movement for funding what we actually need/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /read the thesis/i })).toHaveAttribute('href', '/docs/vision-and-strategy')
  })

  it('renders the Commonality founder page at /founders', () => {
    renderDomainRoute('commonality', '/founders')

    expect(
      screen.getByRole('heading', {
        name: /build a vertical on the public-goods substrate/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /read the movement thesis/i })).toHaveAttribute('href', '/docs/vision-and-strategy')
  })

  it('renders a Commonality compatibility page for old project routes', () => {
    renderDomainRoute('commonality', '/projects')

    expect(screen.getByRole('heading', { name: /project funding now lives on pubstarter/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open pubstarter/i })).toHaveAttribute('href', '#')
  })

  it('renders the Pubstarter landing page at the root route', () => {
    renderDomainRoute('pubstarter')

    expect(
      screen.getByRole('heading', {
        name: /kickstarter for public goods/i,
      })
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /browse projects/i })[0]).toHaveAttribute('href', '/projects')
  })

  it('renders the Alignment landing page at the root route', () => {
    renderDomainRoute('alignment')

    expect(
      screen.getByRole('heading', {
        name: /give to what you care about/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /pledge to a cause/i })).toHaveAttribute('href', '/notes/new')
  })

  it('renders the Tally landing page at the root route', () => {
    renderDomainRoute('tally')

    expect(
      screen.getByRole('heading', {
        name: /sign what you believe/i,
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
    expect(screen.getAllByRole('link', { name: /browse content/i })[0]).toHaveAttribute('href', '/content')
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
        name: /the shared infrastructure beneath the consumer sites/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /developer docs/i })).toHaveAttribute('href', '/docs')
    expect(screen.getAllByRole('link', { name: /open tally/i })[0]).toHaveAttribute('href', '#')
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
    expect(screen.getByText(/reward articles, videos, posts, and channels/i)).toBeInTheDocument()
  })

  it('renders the Noninflammatory about page at /about', async () => {
    renderDomainRoute('noninflammatory', '/about')

    expect(
      await screen.findByRole(
        'heading',
        {
          name: /about civility/i,
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
    expect(screen.getByText(/discover how many other people independently share your common-sense positions/i)).toBeInTheDocument()
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
