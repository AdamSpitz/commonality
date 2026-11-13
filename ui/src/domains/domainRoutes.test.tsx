import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { getDomainManifest, domainManifests, type BuiltDomainId } from './index'
import React, { isValidElement, type ReactNode } from 'react'

function renderDomainRoute(domainId: BuiltDomainId, path = '/') {
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

describe('domain manifest home routes', () => {
  it('owns the Commonality home route', () => {
    const routePaths = extractRoutePaths(domainManifests.commonality.routes)
    expect(routePaths).toContain('/')
  })

  it('renders the Commonality founder page at /founders', () => {
    renderDomainRoute('commonality', '/founders')

    expectRoutePageRendered()
    expectLinkToHref('/docs/vision-and-strategy')
  })

  it('does not expose the retired Commonality participation route', () => {
    const routePaths = extractRoutePaths(domainManifests.commonality.routes)
    expect(routePaths).not.toContain('/participate')
  })

  it('renders the Commonality organization page at /for-organizations', () => {
    renderDomainRoute('commonality', '/for-organizations')

    expectRoutePageRendered()
    expectLinkToHref('/docs/vision-and-strategy/ease-of-adoption/for-established-orgs')
  })

  it('renders the LazyGiving landing page at the root route', () => {
    renderDomainRoute('lazyGiving')

    expectRoutePageRendered()
    expectLinkToHref('/projects')
  })

  it('renders the Aligning landing page at the root route', () => {
    renderDomainRoute('alignment')

    expectRoutePageRendered()
    expectLinkToHref('/docs/alignment/how-alignment-works')
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

})
