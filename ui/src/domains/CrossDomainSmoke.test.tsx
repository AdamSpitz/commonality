import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { domainManifests } from './index'
import type { DomainId } from './types'

const domainIds: DomainId[] = ['commonality', 'content-funding', 'noninflammatory', 'movement']

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

afterEach(() => {
  cleanup()
})

describe.each(domainIds)('cross-domain smoke: %s', (domainId) => {
  const manifest = domainManifests[domainId]

  describe('manifest structure', () => {
    const expectedBranding: Record<DomainId, { name: string; tagline: string; footerText: string }> = {
      commonality: {
        name: 'Commonality',
        tagline: 'Find common ground and fund what matters.',
        footerText: 'Commonality helps people fund projects and content around shared values.',
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
      movement: {
        name: 'Common Sense Majority',
        tagline: 'The silent majority finds its voice.',
        footerText: 'Common Sense Majority organizes the hidden majority around common-sense positions.',
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

    it('has primary navigation items with labels and paths', () => {
      expect(manifest.shell.primaryNavigation.length).toBeGreaterThan(0)
      for (const item of manifest.shell.primaryNavigation) {
        expect(item.label.length).toBeGreaterThan(0)
        expect(item.path.startsWith('/')).toBe(true)
      }
    })

    it('has secondary navigation items with labels and paths', () => {
      expect(manifest.shell.secondaryNavigation.length).toBeGreaterThan(0)
      for (const item of manifest.shell.secondaryNavigation) {
        expect(item.label.length).toBeGreaterThan(0)
        expect(item.path.startsWith('/')).toBe(true)
      }
    })

    it('has routes defined', () => {
      expect(manifest.routes).toBeTruthy()
    })
  })

  describe('primary navigation manifest integrity', () => {
    it.each(manifest.shell.primaryNavigation)(
      '$label has a path starting with /',
      ({ path }) => {
        expect(path.startsWith('/')).toBe(true)
      },
    )
  })

  describe('secondary navigation manifest integrity', () => {
    it.each(manifest.shell.secondaryNavigation)(
      '$label has a path starting with /',
      ({ path }) => {
        expect(path.startsWith('/')).toBe(true)
      },
    )
  })

  describe('landing page', () => {
    const expectedHeroTitles: Record<DomainId, string> = {
      commonality: 'Find common ground first, then fund the work that follows from it.',
      'content-funding': 'Fund the content you want more of.',
      noninflammatory: 'Reward content that lowers the temperature instead of raising it.',
      movement: 'Organize the hidden majority around positions that already have broad support.',
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
        ...manifest.shell.primaryNavigation.map((n) => n.path),
        ...manifest.shell.secondaryNavigation.map((n) => n.path),
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
  it('commonality has all features enabled', () => {
    const features = domainManifests.commonality.features
    expect(features.conceptspace).toBe(true)
    expect(features.pubstarter).toBe(true)
    expect(features.fundingportal).toBe(true)
    expect(features.delegation).toBe(true)
    expect(features.mutablerefs).toBe(true)
    expect(features.contentFunding).toBe(true)
    expect(features.docs).toBe(true)
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

  it('movement has conceptspace, pubstarter, fundingportal, and contentFunding enabled', () => {
    const features = domainManifests.movement.features
    expect(features.conceptspace).toBe(true)
    expect(features.pubstarter).toBe(true)
    expect(features.fundingportal).toBe(true)
    expect(features.contentFunding).toBe(true)
    expect(features.delegation).toBe(false)
    expect(features.mutablerefs).toBe(false)
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
  it('commonality routes include docs, explore, settings, notes, refs, projects, portal', () => {
    const paths = [
      '/docs', '/explore', '/settings', '/notes', '/refs',
      '/projects', '/portal/:statementCid',
    ]
    const routePaths = extractRoutePaths(domainManifests.commonality.routes)
    for (const path of paths) {
      expect(routePaths).toContain(path)
    }
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

  it('movement routes include organize, projects, portal, and about', () => {
    const paths = [
      '/organize', '/about', '/projects', '/projects/new',
      '/projects/:projectAddress', '/portal/:statementCid',
      '/portal/:statementCid/leaderboard',
    ]
    const routePaths = extractRoutePaths(domainManifests.movement.routes)
    for (const path of paths) {
      expect(routePaths).toContain(path)
    }
  })
})

describe('cross-domain landing page rendering', () => {
  it('commonality landing shows focused domain entry points', () => {
    renderDomainRoute('commonality')
    expect(screen.getByText('Focused domain entry points')).toBeInTheDocument()
    expect(screen.getAllByText('Content Funding').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Noninflammatory Content').length).toBeGreaterThan(0)
    expect(screen.getByText('Common Sense Majority')).toBeInTheDocument()
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

  it('movement landing shows broader infrastructure framing', () => {
    renderDomainRoute('movement')
    expect(screen.getByText('Built on Noninflammatory + Commonality')).toBeInTheDocument()
    expect(screen.getByText(/movement site is broader/i)).toBeInTheDocument()
  })
})

describe('cross-domain out-of-domain feature absence', () => {
  it('content-funding domain does not expose docs navigation', () => {
    const nav = domainManifests['content-funding'].shell
    const allNav = [...nav.primaryNavigation, ...nav.secondaryNavigation]
    expect(allNav.some((n) => n.path.startsWith('/docs'))).toBe(false)
  })

  it('content-funding domain does not expose delegation navigation', () => {
    const nav = domainManifests['content-funding'].shell
    const allNav = [...nav.primaryNavigation, ...nav.secondaryNavigation]
    expect(allNav.some((n) => n.path.startsWith('/notes'))).toBe(false)
  })

  it('content-funding domain does not expose pubstarter navigation', () => {
    const nav = domainManifests['content-funding'].shell
    const allNav = [...nav.primaryNavigation, ...nav.secondaryNavigation]
    expect(allNav.some((n) => n.path.startsWith('/projects'))).toBe(false)
  })

  it('noninflammatory domain does not expose docs navigation', () => {
    const nav = domainManifests.noninflammatory.shell
    const allNav = [...nav.primaryNavigation, ...nav.secondaryNavigation]
    expect(allNav.some((n) => n.path.startsWith('/docs'))).toBe(false)
  })

  it('noninflammatory domain does not expose delegation navigation', () => {
    const nav = domainManifests.noninflammatory.shell
    const allNav = [...nav.primaryNavigation, ...nav.secondaryNavigation]
    expect(allNav.some((n) => n.path.startsWith('/notes'))).toBe(false)
  })

  it('movement domain does not expose docs or delegation navigation', () => {
    const nav = domainManifests.movement.shell
    const allNav = [...nav.primaryNavigation, ...nav.secondaryNavigation]
    expect(allNav.some((n) => n.path.startsWith('/docs'))).toBe(false)
    expect(allNav.some((n) => n.path.startsWith('/notes'))).toBe(false)
    expect(allNav.some((n) => n.path.startsWith('/refs'))).toBe(false)
  })

  it('commonality domain exposes the full feature set in navigation', () => {
    const nav = domainManifests.commonality.shell
    const allPaths = [...nav.primaryNavigation, ...nav.secondaryNavigation].map((n) => n.path)
    expect(allPaths.some((p) => p.startsWith('/docs'))).toBe(true)
    expect(allPaths.some((p) => p.startsWith('/notes'))).toBe(true)
    expect(allPaths.some((p) => p.startsWith('/refs'))).toBe(true)
    expect(allPaths.some((p) => p.startsWith('/projects'))).toBe(true)
    expect(allPaths.some((p) => p.startsWith('/settings'))).toBe(true)
  })
})

describe('cross-domain shared routes consistency', () => {
  it('all domains expose statements browsing', () => {
    for (const id of domainIds) {
      const routePaths = extractRoutePaths(domainManifests[id].routes)
      expect(routePaths).toContain('/statements')
    }
  })

  it('all domains expose statement detail', () => {
    for (const id of domainIds) {
      const routePaths = extractRoutePaths(domainManifests[id].routes)
      expect(routePaths).toContain('/statement/:statementCid')
    }
  })

  it('all domains expose user profile', () => {
    for (const id of domainIds) {
      const routePaths = extractRoutePaths(domainManifests[id].routes)
      expect(routePaths).toContain('/profile')
      expect(routePaths).toContain('/user/:address')
    }
  })

  it('all domains expose content funding surfaces', () => {
    for (const id of domainIds) {
      const routePaths = extractRoutePaths(domainManifests[id].routes)
      expect(routePaths).toContain('/content')
      expect(routePaths).toContain('/content/:platform')
      expect(routePaths).toContain('/content/:platform/:channelId')
    }
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
