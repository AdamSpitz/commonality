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
        name: /it's time for internet-age public-goods-funding/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /find a place to participate/i })).toHaveAttribute('href', '/participate')
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

  it('renders the Commonality participation page at /participate', () => {
    renderDomainRoute('commonality', '/participate')

    expect(screen.getByRole('heading', { name: /how can i participate/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go to alignment/i })).toHaveAttribute('href', '/docs/key-ideas/funding-portals')
  })

  it('renders the Pubstarter landing page at the root route', () => {
    renderDomainRoute('pubstarter')

    expect(
      screen.getByRole('heading', {
        name: /retroactive crowdfunding/i,
      })
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /browse projects/i })[0]).toHaveAttribute('href', '/projects')
  })

  it('renders the Alignment landing page at the root route', () => {
    renderDomainRoute('alignment')

    expect(
      screen.getByRole('heading', {
        name: /browse and fund projects aligned with causes you care about/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /explore causes/i })).toHaveAttribute('href', '/explore')
  })

  it('renders the Delegation landing page at the root route', () => {
    renderDomainRoute('delegation')

    expect(
      screen.getByRole('heading', {
        name: /lazily contribute to causes you care about/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view delegation dashboard/i })).toHaveAttribute('href', '/delegation/notes')
  })

  it('renders the Tally landing page at the root route', () => {
    renderDomainRoute('tally')

    expect(
      screen.getByRole('heading', {
        name: /petitions and polls, in your own words/i,
      })
    ).toBeInTheDocument()
  })

  it('renders the Content Funding landing page at the root route', () => {
    renderDomainRoute('content-funding')

    expect(
      screen.getByRole('heading', {
        name: /fund the kind of social-media content you want to see/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse \(x\/youtube\/substack\) creators/i })).toHaveAttribute('href', '/content')
  })

  it('renders the Noninflammatory landing page at the root route', () => {
    renderDomainRoute('noninflammatory')

    expect(
      screen.getByRole('heading', {
        name: /fund civility/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view popular filters/i })).toHaveAttribute('href', '/filters')
  })

  it('renders the CSM landing page at the root route', () => {
    renderDomainRoute('csm')

    expect(
      screen.getByRole('heading', {
        name: /giving the quiet middle majority a voice/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view csm nudgers/i })).toHaveAttribute('href', '/organize')
  })

  it('renders the Conceptspace landing page at the root route', () => {
    renderDomainRoute('conceptspace')

    expect(
      screen.getByRole('heading', {
        name: /make concepts linkable/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go to the attester github repo/i })).toHaveAttribute('href', 'https://gitlab.com/AdamSpitz/commonality/-/tree/main/implication-attester')
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

  it('renders CSM nudger discovery at /organize', async () => {
    renderDomainRoute('csm', '/organize')

    expect(
      await screen.findByRole(
        'heading',
        {
          name: /csm nudgers/i,
        },
        { timeout: 5000 },
      )
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /configure on tally/i })).toHaveAttribute('href', '#')
  })
})
