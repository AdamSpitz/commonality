import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { getLinkHref, isExternalLinkTarget, type LabeledLinkTarget } from '../shared/linkTypes'
import { domainManifests } from './index'
import type { DomainId } from './types'

const domainIds: DomainId[] = ['commonality', 'lazyGiving', 'alignment', 'tally', 'content-funding', 'noninflammatory', 'csm', 'conceptspace']

function renderDomainRoute(domainId: DomainId, path = '/') {
  const manifest = domainManifests[domainId]
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{manifest.routes}</Routes>
    </MemoryRouter>,
  )
}

function getNavigationHref(item: LabeledLinkTarget): string {
  return getLinkHref(item)
}

function expectNavigationLinkTargetToBeValid(item: LabeledLinkTarget) {
  const href = getNavigationHref(item)
  if (isExternalLinkTarget(item)) {
    expect(href === '#' || /^https?:\/\//.test(href)).toBe(true)
  } else {
    expect(href.startsWith('/')).toBe(true)
  }
}

function expectLandingLinkToHref(href: string) {
  expect(screen.getAllByRole('link').some(link => link.getAttribute('href') === href)).toBe(true)
}

afterEach(() => {
  cleanup()
})

describe.each(domainIds)('cross-domain smoke: %s', (domainId) => {
  const manifest = domainManifests[domainId]

  describe('manifest structure', () => {
    const expectedBrandNames: Record<DomainId, string> = {
      commonality: 'Commonality',
      lazyGiving: 'LazyGiving',
      alignment: 'Alignment',
      tally: 'Tally',
      'content-funding': 'Content Funding',
      noninflammatory: 'Civility',
      csm: 'Common Sense Majority',
      conceptspace: 'Conceptspace',
    }

    it('has branding copy for the domain', () => {
      expect(manifest.branding.name).toBe(expectedBrandNames[domainId])
      expect(manifest.branding.tagline.trim().length).toBeGreaterThan(0)
      expect(manifest.shell.footerText.trim().length).toBeGreaterThan(0)
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
    it('renders a hero title', () => {
      renderDomainRoute(domainId)
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent(/\S/)
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
      lazyGiving: false,
      fundingportal: false,
      delegation: false,
      mutablerefs: false,
      contentFunding: false,
      docs: true,
    })
  })

  it('lazyGiving owns individual project contracts and delegation management', () => {
    expect(domainManifests.lazyGiving.features).toMatchObject({
      conceptspace: false,
      lazyGiving: true,
      fundingportal: false,
      delegation: true,
      mutablerefs: false,
      contentFunding: false,
      docs: true,
    })
  })

  it('alignment owns portals, not delegation', () => {
    expect(domainManifests.alignment.features).toMatchObject({
      conceptspace: false,
      lazyGiving: false,
      fundingportal: true,
      delegation: false,
      mutablerefs: false,
      contentFunding: false,
      docs: true,
    })
  })

  it('lazyGiving and content-funding enable delegation feature', () => {
    expect(domainManifests.lazyGiving.features).toMatchObject({
      conceptspace: false,
      lazyGiving: true,
      fundingportal: false,
      delegation: true,
      mutablerefs: false,
      contentFunding: false,
      docs: true,
    })
    expect(domainManifests['content-funding'].features).toMatchObject({
      conceptspace: false,
      lazyGiving: false,
      fundingportal: false,
      delegation: true,
      mutablerefs: false,
      contentFunding: true,
      docs: true,
    })
  })

  it('keeps the existing focused-domain flags', () => {
    expect(domainManifests.tally.features).toMatchObject({ conceptspace: true, fundingportal: true, docs: true })
    expect(domainManifests['content-funding'].features).toMatchObject({ contentFunding: true, lazyGiving: false, fundingportal: false })
    expect(domainManifests.noninflammatory.features).toMatchObject({ contentFunding: true, lazyGiving: false, fundingportal: false })
    expect(domainManifests.csm.features).toMatchObject({ lazyGiving: false, fundingportal: false, contentFunding: false })
    expect(domainManifests.conceptspace.features).toMatchObject({ conceptspace: true, docs: true, lazyGiving: false })
  })
})

describe('cross-domain route ownership', () => {
  it('commonality no longer renders product tools locally, only docs/founders', () => {
    const routePaths = extractRoutePaths(domainManifests.commonality.routes)
    expect(routePaths).toEqual(['/', '/founders', '/participate', '/docs', '/docs/*'])
  })

  it('lazyGiving owns assurance-contract project routes', () => {
    const routePaths = extractRoutePaths(domainManifests.lazyGiving.routes)
    expect(routePaths).toEqual(['/', '/projects', '/projects/new', '/projects/:projectAddress', '/delegation', '/delegation/notes', '/delegation/notes/new', '/delegation/notes/:noteId', '/delegates/:address', '/docs', '/docs/*'])
  })

  it('alignment owns funding-portal routes', () => {
    const routePaths = extractRoutePaths(domainManifests.alignment.routes)
    expect(routePaths).toEqual(['/', '/explore', '/portal/:statementCid', '/portal/:statementCid/leaderboard', '/docs', '/docs/*'])
  })

  it('lazyGiving and content-funding own delegation routes', () => {
    const lazyGivingRoutes = extractRoutePaths(domainManifests.lazyGiving.routes)
    expect(lazyGivingRoutes).toContain('/delegation')
    expect(lazyGivingRoutes).toContain('/delegation/notes')
    expect(lazyGivingRoutes).toContain('/delegation/notes/new')
    expect(lazyGivingRoutes).toContain('/delegation/notes/:noteId')
    expect(lazyGivingRoutes).toContain('/delegates/:address')


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
    for (const id of ['commonality', 'lazyGiving', 'alignment', 'content-funding', 'noninflammatory', 'csm', 'conceptspace'] as DomainId[]) {
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
    expect(routePaths).toEqual(['/', '/about', '/organize', '/popular-statements', '/docs', '/docs/*'])
    expect(routePaths).not.toContain('/content')
    expect(routePaths).not.toContain('/projects')
    expect(routePaths).not.toContain('/portal/:statementCid')
  })
})

describe('cross-domain landing page rendering', () => {
  it('commonality landing links to the movement sections', () => {
    renderDomainRoute('commonality')
    expectLandingLinkToHref('/docs')
    expectLandingLinkToHref('/founders')
    expectLandingLinkToHref('/participate')
  })

  it('lazyGiving landing includes its project actions', () => {
    renderDomainRoute('lazyGiving')
    expect(screen.getByRole('link', { name: /create/i })).toHaveAttribute('href', '/projects/new')
    expect(screen.getByRole('link', { name: /browse/i })).toHaveAttribute('href', '/projects')
  })

  it('alignment landing includes the cause-exploration action', () => {
    renderDomainRoute('alignment')
    expect(screen.getByRole('link', { name: /explore/i })).toHaveAttribute('href', '/explore')
  })

  it('lazyGiving manifest includes delegation in secondary navigation', () => {
    const lazyGivingSecondaryNav = domainManifests.lazyGiving.shell.secondaryNavigation
    const delegationLink = lazyGivingSecondaryNav.find(item => item.label.includes('Delegate'))
    expect(delegationLink).toBeDefined()
    expect(getNavigationHref(delegationLink!)).toBe('/delegation')
  })

  it('content-funding landing includes the content actions', () => {
    renderDomainRoute('content-funding')
    expectLandingLinkToHref('/content')
    expectLandingLinkToHref('/content/dashboard')
  })

  it('conceptspace landing points to developer repos', () => {
    renderDomainRoute('conceptspace')
    expect(screen.getByRole('link', { name: /attester/i })).toHaveAttribute('href', 'https://gitlab.com/AdamSpitz/commonality/-/tree/main/implication-attester')
    expect(screen.getByRole('link', { name: /finder/i })).toHaveAttribute('href', 'https://gitlab.com/AdamSpitz/commonality/-/tree/main/implication-finder')
    expect(screen.getByRole('link', { name: /nudger/i })).toHaveAttribute('href', 'https://gitlab.com/AdamSpitz/commonality/-/tree/main/implication-graph-nudger')
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
