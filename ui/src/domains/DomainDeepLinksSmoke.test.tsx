import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DomainId } from './types'

vi.mock('./lazyRoute', () => ({
  lazyRoute: (_loadModule: unknown, exportName: string) => <div data-testid="lazy-route">{exportName}</div>,
}))

const { domainManifests } = await import('./index')
const publicDocModules = import.meta.glob('../../../docs/end-user/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const sampleParamValues: Record<string, string> = {
  address: '0x1111111111111111111111111111111111111111',
  channelId: 'creator-123',
  noteId: '1',
  platform: 'twitter',
  projectAddress: '0x2222222222222222222222222222222222222222',
  roundAddress: '0x3333333333333333333333333333333333333333',
  statementCid: 'bafybeigdyrzt',
}

const representativeDocsPath = '/docs/why-trust-it'

function extractRoutePaths(routesNode: unknown): string[] {
  const paths: string[] = []
  if (Array.isArray(routesNode)) {
    for (const child of routesNode) {
      paths.push(...extractRoutePaths(child))
    }
    return paths
  }

  if (!routesNode || typeof routesNode !== 'object' || !('props' in routesNode)) return paths
  const props = (routesNode as { props?: Record<string, unknown> }).props
  if (!props) return paths
  if (typeof props.path === 'string') paths.push(props.path)
  if (props.children) paths.push(...extractRoutePaths(props.children))
  return paths
}

function routePatternMatchesPath(routePattern: string, path: string): boolean {
  if (routePattern === path) return true
  if (routePattern.endsWith('/*')) {
    const prefix = routePattern.slice(0, -2)
    return path === prefix || path.startsWith(`${prefix}/`)
  }

  const routeSegments = routePattern.split('/').filter(Boolean)
  const pathSegments = path.split('/').filter(Boolean)
  if (routeSegments.length !== pathSegments.length) return false

  return routeSegments.every((segment, index) => segment.startsWith(':') || segment === pathSegments[index])
}

function normalizeInternalHref(href: string): string {
  const [withoutHash] = href.split('#')
  const [withoutQuery] = withoutHash.split('?')
  if (!withoutQuery || withoutQuery === '/') return '/'
  return withoutQuery.endsWith('/') && withoutQuery.length > 1 ? withoutQuery.slice(0, -1) : withoutQuery
}

function matchingDomainsForPath(path: string): DomainId[] {
  return (Object.keys(domainManifests) as DomainId[]).filter(domainId => {
    const routePaths = extractRoutePaths(domainManifests[domainId].routes)
    return routePaths.some(routePath => routePatternMatchesPath(routePath, path))
  })
}

function extractAbsoluteAppLinks(markdown: string): string[] {
  const links = new Set<string>()
  for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const rawHref = match[1].trim()
    if (!rawHref.startsWith('/') || rawHref.startsWith('/docs/')) continue
    links.add(normalizeInternalHref(rawHref))
  }
  return [...links].sort()
}

function samplePathForRoutePattern(routePattern: string): string {
  if (routePattern === '/docs/*') return representativeDocsPath
  return routePattern.replace(/:([A-Za-z0-9_]+)/g, (_match, paramName: string) => {
    const value = sampleParamValues[paramName]
    if (!value) throw new Error(`No representative value configured for route param :${paramName}`)
    return value
  })
}

function renderDomainPath(domainId: DomainId, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        {domainManifests[domainId].routes}
        <Route path="*" element={<h1>Page not found</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
})

async function expectPathToRender(domainId: DomainId, path: string) {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    renderDomainPath(domainId, path)

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /page not found/i }), `${domainId} ${path} should not render not-found`).not.toBeInTheDocument()
      expect(document.body.textContent?.trim(), `${domainId} ${path} should render visible content`).not.toBe('')
    })
    expect(consoleErrorSpy, `${domainId} ${path} should render without console errors`).not.toHaveBeenCalled()
  } finally {
    consoleErrorSpy.mockRestore()
  }
}

describe('domain representative deep links', () => {
  it('renders every declared domain route pattern with representative params', async () => {
    for (const [domainId, manifest] of Object.entries(domainManifests) as [DomainId, typeof domainManifests[DomainId]][]) {
      for (const routePattern of extractRoutePaths(manifest.routes)) {
        cleanup()
        const path = samplePathForRoutePattern(routePattern)
        await expectPathToRender(domainId, path)
      }
    }
  })

  it('renders public-doc absolute app links in a matching public domain', async () => {
    for (const [modulePath, markdown] of Object.entries(publicDocModules)) {
      for (const href of extractAbsoluteAppLinks(markdown)) {
        cleanup()
        const [domainId] = matchingDomainsForPath(href)
        expect(domainId, `${modulePath} link ${href} should match at least one domain route`).toBeDefined()
        await expectPathToRender(domainId, href)
      }
    }
  })
})
