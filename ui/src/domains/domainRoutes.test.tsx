import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { getDomainManifest, domainManifests } from './index'
import type { DomainId } from './types'
import React, { isValidElement, type ReactNode } from 'react'

function renderDomainRoute(domainId: DomainId, path = '/') {
  const manifest = getDomainManifest(domainId)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{manifest.routes}</Routes>
    </MemoryRouter>
  )
}

type RouteElementProps = {
  path?: string
  children?: ReactNode
}

function extractRoutePaths(routesNode: unknown): string[] {
  const paths: string[] = []
  React.Children.forEach(routesNode as ReactNode, (child) => {
    if (!isValidElement<RouteElementProps>(child)) {
      return
    }

    if (child.props.path && child.props.path !== '*') {
      paths.push(child.props.path)
    }
    if (child.props.children) {
      paths.push(...extractRoutePaths(child.props.children))
    }
  })
  return paths
}

function expectRoutePageRendered() {
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
}

async function expectLazyRoutePageRendered() {
  expect((await screen.findAllByRole('heading', {}, { timeout: 5000 })).length).toBeGreaterThan(0)
}

function expectLinkToHref(href: string) {
  const links = screen.getAllByRole<HTMLAnchorElement>('link')
  expect(links.some((link) => link.href === href || link.getAttribute('href') === href)).toBe(true)
}

function expectLinkHrefContaining(hrefPart: string) {
  const links = screen.getAllByRole<HTMLAnchorElement>('link')
  expect(links.some((link) => link.href.includes(hrefPart) || link.getAttribute('href')?.includes(hrefPart))).toBe(true)
}

describe('domain manifest home routes', () => {
  it('renders the Commonality landing page at the root route', () => {
    renderDomainRoute('commonality')

    expectRoutePageRendered()
    expectLinkToHref('/participate')
  })

  it('renders the Commonality founder page at /founders', () => {
    renderDomainRoute('commonality', '/founders')

    expectRoutePageRendered()
    expectLinkToHref('/docs/vision-and-strategy')
  })

  it('renders the Commonality participation page at /participate', () => {
    renderDomainRoute('commonality', '/participate')

    expectRoutePageRendered()
    expectLinkToHref('/docs/key-ideas/funding-portals')
  })

  it('renders the LazyGiving landing page at the root route', () => {
    renderDomainRoute('lazyGiving')

    expectRoutePageRendered()
    expectLinkToHref('/projects')
  })

  it('renders the Alignment landing page at the root route', () => {
    renderDomainRoute('alignment')

    expectRoutePageRendered()
    expectLinkToHref('/explore')
  })

  it('lazyGiving redirects /delegation to /delegation/notes', () => {
    const lazyGivingRoutes = extractRoutePaths(domainManifests.lazyGiving.routes)
    expect(lazyGivingRoutes).toContain('/delegation')
    expect(lazyGivingRoutes).toContain('/delegation/notes')
  })

  it('renders the Tally landing page at the root route', () => {
    renderDomainRoute('tally')

    expectRoutePageRendered()
  })

  it('renders the Content Funding landing page at the root route', () => {
    renderDomainRoute('content-funding')

    expectRoutePageRendered()
    expectLinkToHref('/content')
  })

  it('renders the Noninflammatory landing page at the root route', () => {
    renderDomainRoute('civility')

    expectRoutePageRendered()
    expectLinkToHref('/filters')
  })

  it('renders the CSM landing page at the root route', () => {
    renderDomainRoute('common-sense-majority')

    expectRoutePageRendered()
    expectLinkHrefContaining('addNudger=0x14dC79964da2C08b23698B3D3cc7Ca32193d9955')
  })

  it('renders the Conceptspace landing page at the root route', () => {
    renderDomainRoute('conceptspace')

    expectRoutePageRendered()
    expectLinkToHref('/docs/conceptspace')
  })

  it('renders Conceptspace developer docs at /docs/conceptspace', async () => {
    renderDomainRoute('conceptspace', '/docs/conceptspace')

    await expectLazyRoutePageRendered()
  })

  it('renders the Content Funding about page at /about', async () => {
    renderDomainRoute('content-funding', '/about')

    await expectLazyRoutePageRendered()
  })

  it('renders the Noninflammatory about page at /about', async () => {
    renderDomainRoute('civility', '/about')

    await expectLazyRoutePageRendered()
  })

  it('renders the CSM about page at /about', async () => {
    renderDomainRoute('common-sense-majority', '/about')

    await expectLazyRoutePageRendered()
  })

  it('renders CSM nudger discovery at /organize', async () => {
    renderDomainRoute('common-sense-majority', '/organize')

    await expectLazyRoutePageRendered()
    expectLinkToHref('#')
  })
})
