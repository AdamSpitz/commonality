import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { isExternalLinkTarget, type LabeledLinkTarget } from '../shared/linkTypes'
import { domainManifests } from './index'
import type { DomainId } from './types'

const domainIds: DomainId[] = ['commonality', 'pubstarter', 'alignment', 'delegation', 'tally', 'content-funding', 'noninflammatory', 'csm', 'conceptspace']

function renderDomainRoute(domainId: DomainId, path = '/') {
  const manifest = domainManifests[domainId]
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{manifest.routes}</Routes>
    </MemoryRouter>,
  )
}

function getNavigationHref(item: LabeledLinkTarget): string {
  return isExternalLinkTarget(item) ? item.href : item.path
}

function expectNavigationLinkTargetToBeValid(item: LabeledLinkTarget) {
  const href = getNavigationHref(item)
  if (isExternalLinkTarget(item)) {
    expect(href === '#' || /^https?:\/\//.test(href)).toBe(true)
  } else {
    expect(href.startsWith('/')).toBe(true)
  }
}

afterEach(() => {
  cleanup()
})

describe.each(domainIds)('cross-domain smoke: %s', (domainId) => {
  const manifest = domainManifests[domainId]

  describe('manifest structure', () => {
    const expectedBranding: Record<DomainId, { name: string; tagline: string; footerText: string }> = {
      commonality: {
        name: 'Commonality',
        tagline: 'A movement for better public-goods funding.',
        footerText: 'Commonality is the movement and thesis layer for better public-goods funding; concrete workflows live on focused product sites.',
      },
      pubstarter: {
        name: 'Pubstarter',
        tagline: 'Kickstarter for public goods.',
        footerText: 'Pubstarter helps people create and fund individual public-goods projects with pledge-and-refund assurance contracts.',
      },
      alignment: {
        name: 'Alignment',
        tagline: 'Ongoing cause funding through trusted judgment.',
        footerText: 'Alignment helps donors fund causes through portals and transparent alignment attestations; delegation lives on the Delegation site.',
      },
      delegation: {
        name: 'Delegation',
        tagline: 'Trusted judgment for public-goods funding.',
        footerText: 'Delegation helps donors route funding through people they trust while delegates build transparent public track records.',
      },
      tally: {
        name: 'Tally',
        tagline: 'Petitions and polls with an implication graph.',
        footerText: 'Tally helps people sign statements and see what public support adds up to.',
      },
      'content-funding': {
        name: 'Content Funding',
        tagline: 'Fund content you believe in.',
        footerText: 'Content Funding helps creators get funded directly by people who share their values.',
      },
      noninflammatory: {
        name: 'Civility',
        tagline: 'Build bridges, not walls.',
        footerText: 'Civility rewards creators who communicate across divides.',
      },
      csm: {
        name: 'Common Sense Majority',
        tagline: 'The hidden majority finds its voice.',
        footerText: 'Common Sense Majority organizes the hidden majority around common-sense positions.',
      },
      conceptspace: {
        name: 'Conceptspace',
        tagline: 'Statement and trust infrastructure for public coordination.',
        footerText: 'Conceptspace provides the statement, implication, signing, nudger, and trust primitives shared across the Commonality ecosystem sites.',
      },
    }

    it('has the correct branding for the domain', () => {
      expect(manifest.branding.name).toBe(expectedBranding[domainId].name)
      expect(manifest.branding.tagline).toBe(expectedBranding[domainId].tagline)
      expect(manifest.shell.footerText).toBe(expectedBranding[domainId].footerText)
    })

    it('has valid primary and secondary navigation items', () => {
      expect(manifest.shell.primaryNavigation.length).toBeGreaterThan(0)
      for (const item of [...manifest.shell.primaryNavigation, ...manifest.shell.secondaryNavigation]) {
        expect(item.label.length).toBeGreaterThan(0)
        expect(getNavigationHref(item).length).toBeGreaterThan(0)
        expectNavigationLinkTargetToBeValid(item)
      }
    })

    it('has routes defined', () => {
      expect(manifest.routes).toBeTruthy()
    })
  })

  describe('landing page', () => {
    const expectedHeroTitles: Record<DomainId, string> = {
      commonality: 'A movement for funding what we actually need.',
      pubstarter: 'Kickstarter for public goods.',
      alignment: 'Give to what you care about. Let someone you trust handle the details.',
      delegation: 'Donate through people whose judgment you trust.',
      tally: 'Sign what you believe. See who else already does.',
      'content-funding': 'Fund the content you want more of.',
      noninflammatory: 'Reward content that lowers the temperature instead of raising it.',
      csm: 'You are not alone. Make the hidden majority visible.',
      conceptspace: 'The shared infrastructure beneath the consumer sites.',
    }

    it('renders the branded hero title', () => {
      renderDomainRoute(domainId)
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent(expectedHeroTitles[domainId])
    })

    it('renders a hero action link with a path from the manifest', () => {
      renderDomainRoute(domainId)
      const links = screen.getAllByRole('link')
      const manifestPaths = new Set([
        ...manifest.shell.primaryNavigation.map(getNavigationHref),
        ...manifest.shell.secondaryNavigation.map(getNavigationHref),
      ])
      expect(links.some((link) => {
        const href = link.getAttribute('href')
        return href && manifestPaths.has(href)
      })).toBe(true)
    })
  })
})

describe('cross-domain feature flag matrix', () => {
  it('commonality is movement/docs only', () => {
    expect(domainManifests.commonality.features).toMatchObject({
      conceptspace: false,
      pubstarter: false,
      fundingportal: false,
      delegation: false,
      mutablerefs: false,
      contentFunding: false,
      docs: true,
    })
  })

  it('pubstarter owns individual project contracts', () => {
    expect(domainManifests.pubstarter.features).toMatchObject({
      conceptspace: false,
      pubstarter: true,
      fundingportal: false,
      delegation: false,
      mutablerefs: false,
      contentFunding: false,
      docs: false,
    })
  })

  it('alignment owns portals, not delegation', () => {
    expect(domainManifests.alignment.features).toMatchObject({
      conceptspace: false,
      pubstarter: false,
      fundingportal: true,
      delegation: false,
      mutablerefs: false,
      contentFunding: false,
      docs: false,
    })
  })

  it('delegation owns donor-delegate management', () => {
    expect(domainManifests.delegation.features).toMatchObject({
      conceptspace: false,
      pubstarter: false,
      fundingportal: false,
      delegation: true,
      mutablerefs: false,
      contentFunding: false,
      docs: false,
    })
  })

  it('keeps the existing focused-domain flags', () => {
    expect(domainManifests.tally.features).toMatchObject({ conceptspace: true, fundingportal: true, docs: true })
    expect(domainManifests['content-funding'].features).toMatchObject({ contentFunding: true, pubstarter: false, fundingportal: false })
    expect(domainManifests.noninflammatory.features).toMatchObject({ contentFunding: true, pubstarter: false, fundingportal: false })
    expect(domainManifests.csm.features).toMatchObject({ pubstarter: true, fundingportal: true, contentFunding: true })
    expect(domainManifests.conceptspace.features).toMatchObject({ conceptspace: true, docs: true, pubstarter: false })
  })
})

describe('cross-domain route ownership', () => {
  it('commonality no longer renders product tools locally, only docs/founders plus compatibility routes', () => {
    const routePaths = extractRoutePaths(domainManifests.commonality.routes)
    expect(routePaths).toEqual(['/', '/founders', '/projects/*', '/notes/*', '/portal/*', '/docs', '/docs/*'])
  })

  it('pubstarter owns assurance-contract project routes', () => {
    const routePaths = extractRoutePaths(domainManifests.pubstarter.routes)
    expect(routePaths).toEqual(['/', '/projects', '/projects/new', '/projects/:projectAddress'])
  })

  it('alignment owns funding-portal routes', () => {
    const routePaths = extractRoutePaths(domainManifests.alignment.routes)
    expect(routePaths).toEqual(['/', '/portal/:statementCid', '/portal/:statementCid/leaderboard'])
  })

  it('delegation owns delegated-fund routes', () => {
    const routePaths = extractRoutePaths(domainManifests.delegation.routes)
    expect(routePaths).toEqual(['/', '/notes', '/notes/new', '/notes/:noteId'])
  })

  it('tally owns user-facing statement and profile routes', () => {
    const routePaths = extractRoutePaths(domainManifests.tally.routes)
    expect(routePaths).toContain('/statements')
    expect(routePaths).toContain('/statement/:statementCid')
    expect(routePaths).toContain('/profile')
    expect(routePaths).toContain('/user/:address')
    for (const id of ['commonality', 'pubstarter', 'alignment', 'delegation', 'content-funding', 'noninflammatory', 'csm', 'conceptspace'] as DomainId[]) {
      const paths = extractRoutePaths(domainManifests[id].routes)
      expect(paths).not.toContain('/statements')
      expect(paths).not.toContain('/statement/:statementCid')
      expect(paths).not.toContain('/profile')
      expect(paths).not.toContain('/user/:address')
    }
  })

  it('content-focused domains expose content funding surfaces', () => {
    for (const id of ['content-funding', 'noninflammatory', 'csm'] as DomainId[]) {
      const routePaths = extractRoutePaths(domainManifests[id].routes)
      expect(routePaths).toContain('/content')
      expect(routePaths).toContain('/content/:platform')
      expect(routePaths).toContain('/content/:platform/:channelId')
    }
    expect(extractRoutePaths(domainManifests.commonality.routes)).not.toContain('/content')
  })
})

describe('cross-domain landing page rendering', () => {
  it('commonality landing points to products instead of owning every product surface', () => {
    renderDomainRoute('commonality')
    expect(screen.getByText('The product sites')).toBeInTheDocument()
    expect(screen.getAllByText('Pubstarter').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Alignment').length).toBeGreaterThan(0)
  })

  it('pubstarter landing focuses on one-off projects', () => {
    renderDomainRoute('pubstarter')
    expect(screen.getByText('One project, one job')).toBeInTheDocument()
    expect(screen.getByText(/Use Pubstarter when you know the specific project/i)).toBeInTheDocument()
  })

  it('alignment landing focuses on portals and cause funding', () => {
    renderDomainRoute('alignment')
    expect(screen.getByText('No second job required')).toBeInTheDocument()
    expect(screen.getByText(/portals organized around causes/i)).toBeInTheDocument()
  })

  it('delegation landing focuses on donor-delegate relationships', () => {
    renderDomainRoute('delegation')
    expect(screen.getByText('Trust, but keep control')).toBeInTheDocument()
    expect(screen.getByText(/someone else's project judgment/i)).toBeInTheDocument()
  })

  it('content-funding landing says it is built on Pubstarter', () => {
    renderDomainRoute('content-funding')
    const chipLabel = document.querySelector('.MuiChip-label')
    expect(chipLabel).toHaveTextContent('How it works')
  })

  it('conceptspace landing points statement signing to Tally', () => {
    renderDomainRoute('conceptspace')
    expect(screen.getByText('For developers, not end users')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Open Tally' })[0]).toHaveAttribute('href', '#')
  })
})

function extractRoutePaths(routesNode: unknown): string[] {
  const paths: string[] = []
  if (Array.isArray(routesNode)) {
    for (const child of routesNode) {
      if (child?.props?.path) {
        paths.push(child.props.path)
      }
      if (child?.props?.children) {
        paths.push(...extractRoutePaths(child.props.children))
      }
    }
  } else if (routesNode && typeof routesNode === 'object' && 'props' in (routesNode as Record<string, unknown>)) {
    const obj = routesNode as Record<string, unknown>
    if (obj.props && typeof obj.props === 'object' && 'path' in (obj.props as Record<string, unknown>)) {
      paths.push((obj.props as Record<string, unknown>).path as string)
    }
    if (obj.props && typeof obj.props === 'object' && 'children' in (obj.props as Record<string, unknown>)) {
      paths.push(...extractRoutePaths((obj.props as Record<string, unknown>).children))
    }
  }
  return paths
}
