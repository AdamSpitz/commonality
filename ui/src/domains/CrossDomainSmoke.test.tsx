import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { isExternalLinkTarget, type LabeledLinkTarget } from '../shared/linkTypes'
import { domainManifests } from './index'
import type { DomainId } from './types'

const domainIds: DomainId[] = ['commonality', 'tally', 'content-funding', 'noninflammatory', 'csm', 'conceptspace']

function renderDomainRoute(
  domainId: DomainId,
  path = '/',
) {
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
    expect(href).toMatch(/^https?:\/\//)
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
        tagline: 'Internet-age coordination for public goods.',
        footerText: 'Commonality is a movement for better public-goods funding and the infrastructure to make it practical.',
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
        name: 'Noninflammatory Content',
        tagline: 'Build bridges, not walls.',
        footerText: 'Noninflammatory Content rewards creators who communicate across divides.',
      },
      csm: {
        name: 'Common Sense Majority',
        tagline: 'The silent majority finds its voice.',
        footerText: 'Common Sense Majority organizes the hidden majority around common-sense positions.',
      },
      conceptspace: {
        name: 'Conceptspace',
        tagline: 'Statement and trust infrastructure for public coordination.',
        footerText: 'Conceptspace provides the statement, implication, signing, nudger, and trust primitives shared across Commonality sites.',
      },
    }

    it('has the correct brand name for the domain', () => {
      expect(manifest.branding.name).toBe(expectedBranding[domainId].name)
    })

    it('has the correct tagline for the domain', () => {
      expect(manifest.branding.tagline).toBe(expectedBranding[domainId].tagline)
    })

    it('has the correct footer text for the domain', () => {
      expect(manifest.shell.footerText).toBe(expectedBranding[domainId].footerText)
    })

    it('has primary navigation items with labels and link targets', () => {
      expect(manifest.shell.primaryNavigation.length).toBeGreaterThan(0)
      for (const item of manifest.shell.primaryNavigation) {
        expect(item.label.length).toBeGreaterThan(0)
        expect(getNavigationHref(item).length).toBeGreaterThan(0)
      }
    })

    it('has secondary navigation items with labels and link targets when present', () => {
      for (const item of manifest.shell.secondaryNavigation) {
        expect(item.label.length).toBeGreaterThan(0)
        expect(getNavigationHref(item).length).toBeGreaterThan(0)
      }
    })

    it('has routes defined', () => {
      expect(manifest.routes).toBeTruthy()
    })
  })

  describe('primary navigation manifest integrity', () => {
    it.each(manifest.shell.primaryNavigation)(
      '$label has a valid link target',
      (item) => {
        expectNavigationLinkTargetToBeValid(item)
      },
    )
  })

  describe('secondary navigation manifest integrity', () => {
    it('has valid link targets when secondary navigation exists', () => {
      for (const item of manifest.shell.secondaryNavigation) {
        expectNavigationLinkTargetToBeValid(item)
      }
    })
  })

  describe('landing page', () => {
    const expectedHeroTitles: Record<DomainId, string> = {
      commonality: 'Build the movement for better public-goods funding.',
      tally: 'Petitions and polls with an implication graph.',
      'content-funding': 'Fund the content you want more of.',
      noninflammatory: 'Reward content that lowers the temperature instead of raising it.',
      csm: 'Organize the hidden majority around positions that already have broad support.',
      conceptspace: 'Statement, implication, signing, and trust infrastructure.',
    }

    it('renders the branded hero title matching the domain tagline', () => {
      renderDomainRoute(domainId)
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent(expectedHeroTitles[domainId])
    })

    it('renders hero action links with paths from the manifest', () => {
      renderDomainRoute(domainId)
      const links = screen.getAllByRole('link')
      const manifestPaths = new Set([
        ...manifest.shell.primaryNavigation.map(getNavigationHref),
        ...manifest.shell.secondaryNavigation.map(getNavigationHref),
      ])
      const hasManifestPath = links.some((link) => {
        const href = link.getAttribute('href')
        return href && manifestPaths.has(href)
      })
      expect(hasManifestPath).toBe(true)
    })
  })
})

describe('cross-domain feature flag matrix', () => {
  it('commonality has funding and docs features enabled', () => {
    const features = domainManifests.commonality.features
    expect(features.conceptspace).toBe(false)
    expect(features.pubstarter).toBe(true)
    expect(features.fundingportal).toBe(true)
    expect(features.delegation).toBe(true)
    expect(features.mutablerefs).toBe(false)
    expect(features.contentFunding).toBe(false)
    expect(features.docs).toBe(true)
  })

  it('tally has only conceptspace enabled', () => {
    const features = domainManifests.tally.features
    expect(features.conceptspace).toBe(true)
    expect(features.pubstarter).toBe(false)
    expect(features.fundingportal).toBe(false)
    expect(features.delegation).toBe(false)
    expect(features.mutablerefs).toBe(false)
    expect(features.contentFunding).toBe(false)
    expect(features.docs).toBe(false)
  })

  it('content-funding has only conceptspace and contentFunding enabled', () => {
    const features = domainManifests['content-funding'].features
    expect(features.conceptspace).toBe(true)
    expect(features.contentFunding).toBe(true)
    expect(features.pubstarter).toBe(false)
    expect(features.fundingportal).toBe(false)
    expect(features.delegation).toBe(false)
    expect(features.mutablerefs).toBe(false)
    expect(features.docs).toBe(false)
  })

  it('noninflammatory has only conceptspace and contentFunding enabled', () => {
    const features = domainManifests.noninflammatory.features
    expect(features.conceptspace).toBe(true)
    expect(features.contentFunding).toBe(true)
    expect(features.pubstarter).toBe(false)
    expect(features.fundingportal).toBe(false)
    expect(features.delegation).toBe(false)
    expect(features.mutablerefs).toBe(false)
    expect(features.docs).toBe(false)
  })

  it('csm has conceptspace, pubstarter, fundingportal, and contentFunding enabled', () => {
    const features = domainManifests.csm.features
    expect(features.conceptspace).toBe(true)
    expect(features.pubstarter).toBe(true)
    expect(features.fundingportal).toBe(true)
    expect(features.contentFunding).toBe(true)
    expect(features.delegation).toBe(false)
    expect(features.mutablerefs).toBe(false)
    expect(features.docs).toBe(false)
  })

  it('conceptspace exposes only the infrastructure-layer feature flag', () => {
    const features = domainManifests.conceptspace.features
    expect(features.conceptspace).toBe(true)
    expect(features.pubstarter).toBe(false)
    expect(features.fundingportal).toBe(false)
    expect(features.delegation).toBe(false)
    expect(features.mutablerefs).toBe(false)
    expect(features.contentFunding).toBe(false)
    expect(features.docs).toBe(false)
  })
})

describe('cross-domain navigation uniqueness', () => {
  it('each domain has a distinct primary navigation set', () => {
    const primaryNavSets = domainIds.map((id) =>
      domainManifests[id].shell.primaryNavigation.map((n) => n.label).sort().join('|'),
    )
    const uniqueSets = new Set(primaryNavSets)
    expect(uniqueSets.size).toBe(domainIds.length)
  })

  it('each domain has distinct footer text', () => {
    const footers = domainIds.map((id) => domainManifests[id].shell.footerText)
    const uniqueFooters = new Set(footers)
    expect(uniqueFooters.size).toBe(domainIds.length)
  })
})

describe('cross-domain route coverage', () => {
  it('commonality routes include docs, notes, projects, and funding portals', () => {
    const paths = [
      '/docs', '/notes', '/notes/new', '/projects', '/projects/new', '/portal/:statementCid',
    ]
    const routePaths = extractRoutePaths(domainManifests.commonality.routes)
    for (const path of paths) {
      expect(routePaths).toContain(path)
    }
    expect(routePaths).not.toContain('/start')
    expect(routePaths).not.toContain('/explore')
    expect(routePaths).not.toContain('/statements')
    expect(routePaths).not.toContain('/statement/:statementCid')
    expect(routePaths).not.toContain('/profile')
    expect(routePaths).not.toContain('/settings')
    expect(routePaths).not.toContain('/refs')
    expect(routePaths).not.toContain('/content')
  })

  it('tally routes include the consumer statement-signing pages', () => {
    const paths = [
      '/', '/start', '/explore', '/statements', '/statement/:statementCid',
      '/profile', '/user/:address', '/settings',
    ]
    const routePaths = extractRoutePaths(domainManifests.tally.routes)
    for (const path of paths) {
      expect(routePaths).toContain(path)
    }
    expect(routePaths).not.toContain('/content')
    expect(routePaths).not.toContain('/projects')
  })

  it('content-funding routes include content dashboard, contracts, and channel pages', () => {
    const paths = [
      '/content', '/content/dashboard', '/content/:platform',
      '/content/:platform/:channelId', '/content/:platform/:channelId/new',
      '/content/contracts/:projectAddress',
    ]
    const routePaths = extractRoutePaths(domainManifests['content-funding'].routes)
    for (const path of paths) {
      expect(routePaths).toContain(path)
    }
  })

  it('noninflammatory routes include about page in addition to content-funding routes', () => {
    const routePaths = extractRoutePaths(domainManifests.noninflammatory.routes)
    expect(routePaths).toContain('/about')
    expect(routePaths).toContain('/content/dashboard')
    expect(routePaths).toContain('/content/:platform/:channelId')
  })

  it('csm routes include organize, projects, portal, and about', () => {
    const paths = [
      '/organize', '/about', '/projects', '/projects/new',
      '/projects/:projectAddress', '/portal/:statementCid',
      '/portal/:statementCid/leaderboard',
    ]
    const routePaths = extractRoutePaths(domainManifests.csm.routes)
    for (const path of paths) {
      expect(routePaths).toContain(path)
    }
  })

  it('conceptspace routes stay thin and infrastructure-facing', () => {
    const routePaths = extractRoutePaths(domainManifests.conceptspace.routes)
    expect(routePaths).toEqual(['/'])
  })
})

describe('cross-domain landing page rendering', () => {
  it('commonality landing shows related product sites instead of owning every product surface', () => {
    renderDomainRoute('commonality')
    expect(screen.getByText('Related product sites')).toBeInTheDocument()
    expect(screen.getAllByText('Tally').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Content Funding').length).toBeGreaterThan(0)
    expect(screen.getByText('Conceptspace')).toBeInTheDocument()
  })

  it('tally landing shows built-on-conceptspace spotlight', () => {
    renderDomainRoute('tally')
    expect(screen.getByText('Built on Conceptspace')).toBeInTheDocument()
    expect(screen.getByText(/consumer statement-signing site/i)).toBeInTheDocument()
  })

  it('content-funding landing shows built-on-commonality spotlight', () => {
    renderDomainRoute('content-funding')
    expect(screen.getByText('Built on Commonality')).toBeInTheDocument()
    expect(screen.getByText(/Content Funding is a focused entry point/i)).toBeInTheDocument()
  })

  it('noninflammatory landing shows political bridge-building framing', () => {
    renderDomainRoute('noninflammatory')
    expect(screen.getByText('Built on Commonality')).toBeInTheDocument()
    expect(screen.getByText(/political bridge-building surface/i)).toBeInTheDocument()
  })

  it('csm landing shows broader infrastructure framing', () => {
    renderDomainRoute('csm')
    expect(screen.getByText('Built on Noninflammatory + Commonality')).toBeInTheDocument()
    expect(screen.getByText(/movement site is broader/i)).toBeInTheDocument()
  })

  it('conceptspace landing points statement signing to Tally', () => {
    renderDomainRoute('conceptspace')
    expect(screen.getByText('Infrastructure, not the consumer app')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Tally' })).toHaveAttribute('href', '#')
  })
})

describe('cross-domain out-of-domain feature absence', () => {
  it('tally domain keeps navigation focused on statement signing', () => {
    const nav = domainManifests.tally.shell
    const allNav = [...nav.primaryNavigation, ...nav.secondaryNavigation].map(getNavigationHref)
    expect(allNav.some((href) => href.startsWith('/statements'))).toBe(true)
    expect(allNav.some((href) => href.startsWith('/settings'))).toBe(true)
    expect(allNav.some((href) => href.startsWith('/content'))).toBe(false)
    expect(allNav.some((href) => href.startsWith('/projects'))).toBe(false)
    expect(allNav.some((href) => href.startsWith('/docs'))).toBe(false)
  })

  it('content-funding domain does not expose docs navigation', () => {
    const nav = domainManifests['content-funding'].shell
    const allNav = [...nav.primaryNavigation, ...nav.secondaryNavigation].map(getNavigationHref)
    expect(allNav.some((href) => href.startsWith('/docs'))).toBe(false)
  })

  it('content-funding domain does not expose delegation navigation', () => {
    const nav = domainManifests['content-funding'].shell
    const allNav = [...nav.primaryNavigation, ...nav.secondaryNavigation].map(getNavigationHref)
    expect(allNav.some((href) => href.startsWith('/notes'))).toBe(false)
  })

  it('content-funding domain does not expose pubstarter navigation', () => {
    const nav = domainManifests['content-funding'].shell
    const allNav = [...nav.primaryNavigation, ...nav.secondaryNavigation].map(getNavigationHref)
    expect(allNav.some((href) => href.startsWith('/projects'))).toBe(false)
  })

  it('noninflammatory domain does not expose docs navigation', () => {
    const nav = domainManifests.noninflammatory.shell
    const allNav = [...nav.primaryNavigation, ...nav.secondaryNavigation].map(getNavigationHref)
    expect(allNav.some((href) => href.startsWith('/docs'))).toBe(false)
  })

  it('noninflammatory domain does not expose delegation navigation', () => {
    const nav = domainManifests.noninflammatory.shell
    const allNav = [...nav.primaryNavigation, ...nav.secondaryNavigation].map(getNavigationHref)
    expect(allNav.some((href) => href.startsWith('/notes'))).toBe(false)
  })

  it('csm domain does not expose docs or delegation navigation', () => {
    const nav = domainManifests.csm.shell
    const allNav = [...nav.primaryNavigation, ...nav.secondaryNavigation].map(getNavigationHref)
    expect(allNav.some((href) => href.startsWith('/docs'))).toBe(false)
    expect(allNav.some((href) => href.startsWith('/notes'))).toBe(false)
    expect(allNav.some((href) => href.startsWith('/refs'))).toBe(false)
  })

  it('commonality domain navigation focuses on funding infrastructure and docs', () => {
    const nav = domainManifests.commonality.shell
    const allPaths = [...nav.primaryNavigation, ...nav.secondaryNavigation].map(getNavigationHref)
    expect(allPaths.some((p) => p.startsWith('/docs'))).toBe(true)
    expect(allPaths.some((p) => p.startsWith('/notes'))).toBe(true)
    expect(allPaths.some((p) => p.startsWith('/projects'))).toBe(true)
    expect(allPaths.some((p) => p.startsWith('/refs'))).toBe(false)
    expect(allPaths.some((p) => p.startsWith('/settings'))).toBe(false)
    expect(allPaths.some((p) => p.startsWith('/statements'))).toBe(false)
    expect(allPaths.some((p) => p.startsWith('/content'))).toBe(false)
  })

  it('conceptspace domain does not expose consumer or funding navigation', () => {
    const nav = domainManifests.conceptspace.shell
    const allPaths = [...nav.primaryNavigation, ...nav.secondaryNavigation].map(getNavigationHref)
    expect(allPaths).toEqual(['/'])
  })
})

describe('cross-domain shared routes consistency', () => {
  it('all remaining statement-surface domains expose statements browsing', () => {
    const statementSurfaceDomainIds: DomainId[] = ['tally', 'content-funding', 'noninflammatory', 'csm']
    for (const id of statementSurfaceDomainIds) {
      const routePaths = extractRoutePaths(domainManifests[id].routes)
      expect(routePaths).toContain('/statements')
    }
    expect(extractRoutePaths(domainManifests.commonality.routes)).not.toContain('/statements')
  })

  it('all remaining statement-surface domains expose statement detail', () => {
    const statementSurfaceDomainIds: DomainId[] = ['tally', 'content-funding', 'noninflammatory', 'csm']
    for (const id of statementSurfaceDomainIds) {
      const routePaths = extractRoutePaths(domainManifests[id].routes)
      expect(routePaths).toContain('/statement/:statementCid')
    }
    expect(extractRoutePaths(domainManifests.commonality.routes)).not.toContain('/statement/:statementCid')
  })

  it('all remaining statement-surface domains expose user profile', () => {
    const statementSurfaceDomainIds: DomainId[] = ['tally', 'content-funding', 'noninflammatory', 'csm']
    for (const id of statementSurfaceDomainIds) {
      const routePaths = extractRoutePaths(domainManifests[id].routes)
      expect(routePaths).toContain('/profile')
      expect(routePaths).toContain('/user/:address')
    }
    const commonalityRoutePaths = extractRoutePaths(domainManifests.commonality.routes)
    expect(commonalityRoutePaths).not.toContain('/profile')
    expect(commonalityRoutePaths).not.toContain('/user/:address')
  })

  it('content-focused domains expose content funding surfaces', () => {
    const contentSurfaceDomainIds: DomainId[] = ['content-funding', 'noninflammatory', 'csm']
    for (const id of contentSurfaceDomainIds) {
      const routePaths = extractRoutePaths(domainManifests[id].routes)
      expect(routePaths).toContain('/content')
      expect(routePaths).toContain('/content/:platform')
      expect(routePaths).toContain('/content/:platform/:channelId')
    }
    expect(extractRoutePaths(domainManifests.commonality.routes)).not.toContain('/content')
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
