import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { isExternalLinkTarget, type LabeledLinkTarget } from '../shared/linkTypes'
import { domainManifests } from './index'
import type { DomainId } from './types'

const domainIds: DomainId[] = ['commonality', 'pubstarter', 'alignment', 'tally', 'content-funding', 'noninflammatory', 'csm', 'conceptspace']

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
        footerText: 'Alignment helps donors fund causes through portals and transparent alignment attestations; delegation is managed from Pubstarter and Content Funding.',
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
      commonality: "It's time for Internet-age public-goods-funding",
      pubstarter: 'Retroactive crowdfunding',
      alignment: 'Browse and fund projects aligned with causes you care about',
      tally: 'Petitions and polls, in your own words',
      'content-funding': 'Fund the kind of social-media content you want to see',
      noninflammatory: 'Fund civility',
      csm: 'Giving the quiet middle majority a voice',
      conceptspace: 'Make concepts linkable',
    }

    it('renders the branded hero title', () => {
      renderDomainRoute(domainId)
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent(expectedHeroTitles[domainId])
    })

    it('renders valid landing links when the landing page has links', () => {
      renderDomainRoute(domainId)
      const links = screen.queryAllByRole('link')
      for (const link of links) {
        const href = link.getAttribute('href')
        expect(href).toBeTruthy()
        expect(href).not.toBe('#')
        expect(href?.startsWith('/') || /^https?:\/\//.test(href ?? '')).toBe(true)
      }
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

  it('pubstarter owns individual project contracts and delegation management', () => {
    expect(domainManifests.pubstarter.features).toMatchObject({
      conceptspace: false,
      pubstarter: true,
      fundingportal: false,
      delegation: true,
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

  it('pubstarter and content-funding enable delegation feature', () => {
    expect(domainManifests.pubstarter.features).toMatchObject({
      conceptspace: false,
      pubstarter: true,
      fundingportal: false,
      delegation: true,
      mutablerefs: false,
      contentFunding: false,
      docs: false,
    })
    expect(domainManifests['content-funding'].features).toMatchObject({
      conceptspace: false,
      pubstarter: false,
      fundingportal: false,
      delegation: true,
      mutablerefs: false,
      contentFunding: true,
      docs: false,
    })
  })

  it('keeps the existing focused-domain flags', () => {
    expect(domainManifests.tally.features).toMatchObject({ conceptspace: true, fundingportal: true, docs: true })
    expect(domainManifests['content-funding'].features).toMatchObject({ contentFunding: true, pubstarter: false, fundingportal: false })
    expect(domainManifests.noninflammatory.features).toMatchObject({ contentFunding: true, pubstarter: false, fundingportal: false })
    expect(domainManifests.csm.features).toMatchObject({ pubstarter: false, fundingportal: false, contentFunding: false })
    expect(domainManifests.conceptspace.features).toMatchObject({ conceptspace: true, docs: true, pubstarter: false })
  })
})

describe('cross-domain route ownership', () => {
  it('commonality no longer renders product tools locally, only docs/founders', () => {
    const routePaths = extractRoutePaths(domainManifests.commonality.routes)
    expect(routePaths).toEqual(['/', '/founders', '/participate', '/docs', '/docs/*'])
  })

  it('pubstarter owns assurance-contract project routes', () => {
    const routePaths = extractRoutePaths(domainManifests.pubstarter.routes)
    expect(routePaths).toEqual(['/', '/projects', '/projects/new', '/projects/:projectAddress', '/delegation', '/delegation/notes', '/delegation/notes/new', '/delegation/notes/:noteId', '/delegates/:address'])
  })

  it('alignment owns funding-portal routes', () => {
    const routePaths = extractRoutePaths(domainManifests.alignment.routes)
    expect(routePaths).toEqual(['/', '/explore', '/portal/:statementCid', '/portal/:statementCid/leaderboard'])
  })

  it('pubstarter and content-funding own delegation routes', () => {
    const pubstarterRoutes = extractRoutePaths(domainManifests.pubstarter.routes)
    expect(pubstarterRoutes).toContain('/delegation')
    expect(pubstarterRoutes).toContain('/delegation/notes')
    expect(pubstarterRoutes).toContain('/delegation/notes/new')
    expect(pubstarterRoutes).toContain('/delegation/notes/:noteId')
    expect(pubstarterRoutes).toContain('/delegates/:address')


    const contentFundingRoutes = extractRoutePaths(domainManifests['content-funding'].routes)
    expect(contentFundingRoutes).toContain('/delegation')
    expect(contentFundingRoutes).toContain('/delegation/notes')
    expect(contentFundingRoutes).toContain('/delegation/notes/new')
    expect(contentFundingRoutes).toContain('/delegation/notes/:noteId')
  })

  it('tally owns user-facing statement and profile routes, but not an explorer yet', () => {
    const routePaths = extractRoutePaths(domainManifests.tally.routes)
    expect(routePaths).toContain('/statements')
    expect(routePaths).toContain('/statement/:statementCid')
    expect(routePaths).toContain('/profile')
    expect(routePaths).toContain('/user/:address')
    expect(routePaths).not.toContain('/explore')
    expect(domainManifests.tally.shell.primaryNavigation).not.toContainEqual({ label: 'Explore', path: '/explore' })
    for (const id of ['commonality', 'pubstarter', 'alignment', 'content-funding', 'noninflammatory', 'csm', 'conceptspace'] as DomainId[]) {
      const paths = extractRoutePaths(domainManifests[id].routes)
      expect(paths).not.toContain('/statements')
      expect(paths).not.toContain('/statement/:statementCid')
      expect(paths).not.toContain('/profile')
      expect(paths).not.toContain('/user/:address')
    }
  })

  it('content-focused product domains expose content funding surfaces', () => {
    for (const id of ['content-funding', 'noninflammatory'] as DomainId[]) {
      const routePaths = extractRoutePaths(domainManifests[id].routes)
      expect(routePaths).toContain('/content')
      expect(routePaths).toContain('/content/:platform')
      expect(routePaths).toContain('/content/:platform/:channelId')
    }
    expect(extractRoutePaths(domainManifests.commonality.routes)).not.toContain('/content')
  })

  it('csm is a thin movement site with thesis, statement, and nudger routes only', () => {
    const routePaths = extractRoutePaths(domainManifests.csm.routes)
    expect(routePaths).toEqual(['/', '/about', '/organize', '/popular-statements'])
    expect(routePaths).not.toContain('/content')
    expect(routePaths).not.toContain('/projects')
    expect(routePaths).not.toContain('/portal/:statementCid')
  })
})

describe('cross-domain landing page rendering', () => {
  it('commonality landing carries the movement sections', () => {
    renderDomainRoute('commonality')
    expect(screen.getByText('Read more about the vision')).toBeInTheDocument()
    expect(screen.getByText('For founders/organizers')).toBeInTheDocument()
    expect(screen.getByText('How can I participate?')).toBeInTheDocument()
  })

  it('pubstarter landing includes its project actions', () => {
    renderDomainRoute('pubstarter')
    expect(screen.getByRole('link', { name: 'Create a project' })).toHaveAttribute('href', '/projects/new')
    expect(screen.getByRole('link', { name: 'Browse projects' })).toHaveAttribute('href', '/projects')
  })

  it('alignment landing includes the cause-exploration action', () => {
    renderDomainRoute('alignment')
    expect(screen.getByRole('link', { name: 'Explore causes' })).toHaveAttribute('href', '/explore')
  })

  it('pubstarter manifest includes delegation in secondary navigation', () => {
    const pubstarterSecondaryNav = domainManifests.pubstarter.shell.secondaryNavigation
    const delegationLink = pubstarterSecondaryNav.find(item => item.label.includes('Delegate'))
    expect(delegationLink).toBeDefined()
    expect(getNavigationHref(delegationLink!)).toBe('/delegation')
  })

  it('content-funding landing includes the content actions', () => {
    renderDomainRoute('content-funding')
    expect(screen.getByRole('link', { name: 'Browse (X/YouTube/Substack) creators' })).toHaveAttribute('href', '/content')
    expect(screen.getByRole('link', { name: 'I am a content creator' })).toHaveAttribute('href', '/content/dashboard')
  })

  it('conceptspace landing points to developer repos', () => {
    renderDomainRoute('conceptspace')
    expect(screen.getByRole('link', { name: 'Go to the attester GitHub repo' })).toHaveAttribute('href', 'https://gitlab.com/AdamSpitz/commonality/-/tree/main/implication-attester')
    expect(screen.getByRole('link', { name: 'Go to the finder GitHub repo' })).toHaveAttribute('href', 'https://gitlab.com/AdamSpitz/commonality/-/tree/main/implication-finder')
    expect(screen.getByRole('link', { name: 'Go to the sample nudger GitHub repo' })).toHaveAttribute('href', 'https://gitlab.com/AdamSpitz/commonality/-/tree/main/implication-graph-nudger')
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
