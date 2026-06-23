import { isCrossDomainLinkTarget, isExternalLinkTarget, type LinkTarget } from '../shared'
import { getRuntimeConfig, type UiRuntimeConfig } from '../shared'
import { getAppUrl, isHashRouting } from '../shared'
import type { DomainId } from './types'

type DomainUrlRuntimeConfigKey =
  | 'VITE_COMMONALITY_URL'
  | 'VITE_LAZYGIVING_URL'
  | 'VITE_ALIGNMENT_URL'
  | 'VITE_TALLY_URL'
  | 'VITE_CONTENT_FUNDING_URL'
  | 'VITE_CIVILITY_URL'
  | 'VITE_COMMON_SENSE_MAJORITY_URL'
  | 'VITE_CONCEPTSPACE_URL'

const domainUrlKeys: Record<DomainId, DomainUrlRuntimeConfigKey> = {
  commonality: 'VITE_COMMONALITY_URL',
  lazyGiving: 'VITE_LAZYGIVING_URL',
  alignment: 'VITE_ALIGNMENT_URL',
  tally: 'VITE_TALLY_URL',
  'content-funding': 'VITE_CONTENT_FUNDING_URL',
  civility: 'VITE_CIVILITY_URL',
  'common-sense-majority': 'VITE_COMMON_SENSE_MAJORITY_URL',
  conceptspace: 'VITE_CONCEPTSPACE_URL',
}

const domainHostLabels: Record<DomainId, string> = {
  commonality: 'commonality',
  lazyGiving: 'lazygiving',
  alignment: 'alignment',
  tally: 'tally',
  'content-funding': 'content-funding',
  civility: 'civility',
  'common-sense-majority': 'common-sense-majority',
  conceptspace: 'conceptspace',
}

const knownDomainHostLabels = new Set(Object.values(domainHostLabels))
const commonalityHostSuffixes = ['commonality.works', 'commonality.eth.limo']

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
  const configuredBaseUrl = config[domainUrlKeys[domainId]]
  if (configuredBaseUrl && shouldPreferConfiguredDomainUrl(configuredBaseUrl)) {
    return appendPathToBaseUrl(configuredBaseUrl, path)
  }

  const smartBaseUrl = getSameNamingLayerDomainBaseUrl(domainId)
  if (smartBaseUrl) {
    return appendPathToBaseUrl(smartBaseUrl, path)
  }

  if (!configuredBaseUrl) {
    return options.fallbackHref ?? path
  }
  return appendPathToBaseUrl(configuredBaseUrl, path)
}

export function isDomainConfigured(domainId: DomainId): boolean {
  return Boolean(getSameNamingLayerDomainBaseUrl(domainId) || getRuntimeConfig()[domainUrlKeys[domainId]])
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

function shouldPreferConfiguredDomainUrl(baseUrl: string): boolean {
  try {
    const parsedUrl = new URL(baseUrl)
    return parsedUrl.pathname !== '/' || parsedUrl.hash !== ''
  } catch {
    return true
  }
}

function getSameNamingLayerDomainBaseUrl(domainId: DomainId): string | undefined {
  if (typeof window === 'undefined') return undefined

  const hostname = window.location.hostname.toLowerCase()
  const suffix = commonalityHostSuffixes.find((candidate) => hostname === candidate || hostname.endsWith(`.${candidate}`))
  if (!suffix) return undefined

  const remainder = hostname === suffix ? '' : hostname.slice(0, -(suffix.length + 1))
  const remainderLabels = remainder ? remainder.split('.') : []
  const rootSuffix = knownDomainHostLabels.has(remainderLabels[0])
    ? [...remainderLabels.slice(1), suffix].filter(Boolean).join('.')
    : hostname
  const targetLabel = domainHostLabels[domainId]
  const targetHost = rootSuffix === suffix && targetLabel === 'commonality'
    ? suffix
    : `${targetLabel}.${rootSuffix}`
  const port = window.location.port ? `:${window.location.port}` : ''
  const hashRouterBase = isHashRouting() ? '/#/' : ''

  return `${window.location.protocol}//${targetHost}${port}${hashRouterBase}`
}

function appendPathToBaseUrl(baseUrl: string, path: string): string {
  if (path === '/') {
    return baseUrl
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const trimmedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return `${trimmedBaseUrl}${normalizedPath}`
}
