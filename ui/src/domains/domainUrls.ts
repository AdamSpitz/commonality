import { isCrossDomainLinkTarget, isExternalLinkTarget, type LinkTarget } from '../shared/linkTypes'
import { getRuntimeConfig, type UiRuntimeConfig } from '../shared/runtimeConfig'
import { getAppUrl } from '../shared/routing'
import type { DomainId } from './types'

type DomainUrlRuntimeConfigKey =
  | 'VITE_COMMONALITY_URL'
  | 'VITE_PUBSTARTER_URL'
  | 'VITE_ALIGNMENT_URL'
  | 'VITE_TALLY_URL'
  | 'VITE_CONTENT_FUNDING_URL'
  | 'VITE_NONINFLAMMATORY_URL'
  | 'VITE_CSM_URL'
  | 'VITE_CONCEPTSPACE_URL'

const domainUrlKeys: Record<DomainId, DomainUrlRuntimeConfigKey> = {
  commonality: 'VITE_COMMONALITY_URL',
  pubstarter: 'VITE_PUBSTARTER_URL',
  alignment: 'VITE_ALIGNMENT_URL',
  tally: 'VITE_TALLY_URL',
  'content-funding': 'VITE_CONTENT_FUNDING_URL',
  noninflammatory: 'VITE_NONINFLAMMATORY_URL',
  csm: 'VITE_CSM_URL',
  conceptspace: 'VITE_CONCEPTSPACE_URL',
}

interface DomainUrlOptions {
  fallbackHref?: string
}

export function getDomainUrl(domainId: DomainId, path = '/', options: DomainUrlOptions = {}): string {
  return resolveDomainUrlFromConfig(getRuntimeConfig(), domainId, path, options)
}

export function resolveDomainUrlFromConfig(
  config: UiRuntimeConfig,
  domainId: DomainId,
  path = '/',
  options: DomainUrlOptions = {},
): string {
  const baseUrl = config[domainUrlKeys[domainId]]
  if (!baseUrl) {
    return options.fallbackHref ?? path
  }
  return appendPathToBaseUrl(baseUrl, path)
}

export function isDomainConfigured(domainId: DomainId): boolean {
  return Boolean(getRuntimeConfig()[domainUrlKeys[domainId]])
}

/** Resolves a LinkTarget to a final href string, including cross-domain URL resolution.
 *  If a cross-domain link's target domain isn't configured (e.g. in dev), returns a
 *  /_cross-domain-unavailable route so the user sees a helpful error page instead of a broken link. */
export function resolveLinkHref(link: LinkTarget): string {
  if (isExternalLinkTarget(link)) return link.href
  if (isCrossDomainLinkTarget(link)) {
    const domainId = link.domain as DomainId
    if (!isDomainConfigured(domainId)) {
      const params = new URLSearchParams({ domain: domainId, path: link.path ?? '/' })
      return getAppUrl(`/_cross-domain-unavailable?${params}`)
    }
    return getDomainUrl(domainId, link.path ?? '/')
  }
  return link.path
}

function appendPathToBaseUrl(baseUrl: string, path: string): string {
  if (path === '/') {
    return baseUrl
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const trimmedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return `${trimmedBaseUrl}${normalizedPath}`
}
