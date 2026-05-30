import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { isExternalLinkTarget } from '../shared/linkTypes'
import { domainManifests } from './index'
import type { DomainId } from './types'

const allowedExternalHosts = new Set([
  'github.com',
  'gitlab.com',
  'linkdrop.io',
  'thirdweb.com',
])

const publicDocModules = import.meta.glob('../../../docs/end-user/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const domainIds = Object.keys(domainManifests) as DomainId[]

function expectAllowedExternalUrl(url: string, source: string) {
  const parsedUrl = new URL(url)
  expect(
    parsedUrl.protocol,
    `${source} external link ${url} should be http(s)`
  ).toMatch(/^https?:$/)

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

function markdownExternalUrls(markdown: string): string[] {
  return Array.from(markdown.matchAll(/https?:\/\/[^\s)]+/g), match => match[0])
}

function renderDomainLanding(domainId: DomainId) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>{domainManifests[domainId].routes}</Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
})

describe('external link allowlist', () => {
  it('keeps public docs external links on intentionally allowed hosts', () => {
    for (const [modulePath, markdown] of Object.entries(publicDocModules)) {
      for (const url of markdownExternalUrls(markdown)) {
        expectAllowedExternalUrl(url, modulePath)
      }
    }
  })

  it('keeps domain navigation external links on intentionally allowed hosts', () => {
    for (const [domainId, manifest] of Object.entries(domainManifests)) {
      for (const item of [...manifest.shell.primaryNavigation, ...manifest.shell.secondaryNavigation]) {
        if (isExternalLinkTarget(item)) {
          expectAllowedExternalUrl(item.href, `${domainId} navigation item ${item.label}`)
        }
      }
    }
  })

  it('keeps rendered landing-page external links on intentionally allowed hosts', () => {
    for (const domainId of domainIds) {
      cleanup()
      renderDomainLanding(domainId)
      for (const link of screen.queryAllByRole('link')) {
        const href = link.getAttribute('href')
        if (href?.startsWith('http://') || href?.startsWith('https://')) {
          expectAllowedExternalUrl(href, `${domainId} landing page`)
        }
      }
    }
  })
})
