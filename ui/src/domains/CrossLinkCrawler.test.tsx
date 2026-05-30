import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { domainManifests } from './index'
import type { DomainId } from './types'

const domainIds = Object.keys(domainManifests) as DomainId[]
const publicDocModules = import.meta.glob('../../../docs/end-user/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const routeParamSamples: Record<string, string> = {
  address: '0x0000000000000000000000000000000000000001',
  noteId: '1',
  platform: 'youtube',
  projectAddress: '0x0000000000000000000000000000000000000002',
  statementCid: 'bafybeigdyrztktxq5mkrl3zpnczqtyse534w7y576guthacdf5uloxx3za',
  channelId: 'demo-channel',
}

type CrawledPage = {
  domainId: DomainId
  path: string
  source: string
}

function normalizeInternalHref(href: string): string {
  const withoutOrigin = href.replace(/^https?:\/\/[^/]+/, '')
  const [withoutHash] = withoutOrigin.split('#')
  const [withoutQuery] = withoutHash.split('?')
  if (!withoutQuery || withoutQuery === '/') return '/'
  return withoutQuery.endsWith('/') && withoutQuery.length > 1 ? withoutQuery.slice(0, -1) : withoutQuery
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

function extractRoutePaths(routesNode: unknown): string[] {
  const paths: string[] = []
  if (Array.isArray(routesNode)) {
    for (const child of routesNode) {
      if (child?.props?.path) paths.push(child.props.path)
      if (child?.props?.children) paths.push(...extractRoutePaths(child.props.children))
    }
  } else if (routesNode && typeof routesNode === 'object' && 'props' in (routesNode as Record<string, unknown>)) {
    const obj = routesNode as Record<string, unknown>
    const props = obj.props as Record<string, unknown> | undefined
    if (typeof props?.path === 'string') paths.push(props.path)
    if (props?.children) paths.push(...extractRoutePaths(props.children))
  }
  return paths
}

function samplePath(routePattern: string): string {
  if (routePattern.endsWith('/*')) return routePattern.slice(0, -2)
  return routePattern.replace(/:([A-Za-z0-9_]+)/g, (_, paramName: string) => {
    const sample = routeParamSamples[paramName]
    expect(sample, `missing routeParamSamples entry for :${paramName}`).toBeDefined()
    return sample
  })
}

function internalHrefResolvesInAnyPublicDomain(href: string): boolean {
  const path = normalizeInternalHref(href)
  return domainIds.some(domainId => {
    const routePaths = extractRoutePaths(domainManifests[domainId].routes)
    return routePaths.some(routePath => routePatternMatchesPath(routePath, path))
  })
}

function renderDomainPath(domainId: DomainId, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{domainManifests[domainId].routes}</Routes>
    </MemoryRouter>,
  )
}

const allowedExternalHosts = new Set([
  'github.com',
  'gitlab.com',
  'linkdrop.io',
  'thirdweb.com',
])

function renderedLinks(): string[] {
  return screen
    .queryAllByRole('link')
    .map(link => link.getAttribute('href'))
    .filter((href): href is string => Boolean(href))
}

function expectAllowedExternalUrl(url: string, source: string) {
  const parsedUrl = new URL(url)
  expect(parsedUrl.protocol, `${source} external link ${url} should be http(s)`).toMatch(/^https?:$/)

  if (parsedUrl.hostname === 'localhost' && parsedUrl.pathname === '/_cross-domain-unavailable') {
    expect(parsedUrl.searchParams.get('domain'), `${source} localhost cross-domain fallback should name its domain`).toBeTruthy()
    expect(parsedUrl.searchParams.get('path'), `${source} localhost cross-domain fallback should name its path`).toMatch(/^\//)
    return
  }

  expect(
    allowedExternalHosts.has(parsedUrl.hostname),
    `${source} external link ${url} should use an explicitly allowed host; add it to allowedExternalHosts if intentional`,
  ).toBe(true)
}

function docsAppLinks(markdown: string): string[] {
  const links = new Set<string>()
  for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const rawHref = match[1].trim()
    if (!rawHref.startsWith('/') || rawHref.startsWith('/docs/')) continue
    links.add(normalizeInternalHref(rawHref))
  }
  return [...links].sort()
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('cross-link crawler for rendered UI and public docs', () => {
  it('renders every public domain route sample without React console errors', () => {
    for (const domainId of domainIds) {
      for (const routePath of extractRoutePaths(domainManifests[domainId].routes)) {
        cleanup()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const path = samplePath(routePath)
        renderDomainPath(domainId, path)
        expect(errorSpy, `${domainId} ${path} should render without console.error`).not.toHaveBeenCalled()
      }
    }
  })

  it('crawls rendered route samples and only finds resolvable internal app links', () => {
    const pages: CrawledPage[] = domainIds.flatMap(domainId =>
      extractRoutePaths(domainManifests[domainId].routes).map(routePath => ({
        domainId,
        path: samplePath(routePath),
        source: `${domainId} ${routePath}`,
      })),
    )

    for (const page of pages) {
      cleanup()
      renderDomainPath(page.domainId, page.path)
      for (const href of renderedLinks().filter(href => href.startsWith('/'))) {
        expect(
          internalHrefResolvesInAnyPublicDomain(href),
          `${page.source} rendered internal link ${href} should resolve in a public domain route table`,
        ).toBe(true)
      }
    }
  })

  it('keeps rendered route-sample external links on intentionally allowed hosts', () => {
    for (const domainId of domainIds) {
      for (const routePath of extractRoutePaths(domainManifests[domainId].routes)) {
        cleanup()
        const path = samplePath(routePath)
        renderDomainPath(domainId, path)
        for (const href of renderedLinks().filter(href => href.startsWith('http://') || href.startsWith('https://'))) {
          expectAllowedExternalUrl(href, `${domainId} ${routePath}`)
        }
      }
    }
  })

  it('keeps absolute public-doc app links pointed at public domain routes', () => {
    for (const [modulePath, markdown] of Object.entries(publicDocModules)) {
      for (const href of docsAppLinks(markdown)) {
        expect(
          internalHrefResolvesInAnyPublicDomain(href),
          `${modulePath} app link ${href} should resolve in a public domain route table`,
        ).toBe(true)
      }
    }
  })
})
