import { getRuntimeConfig, type UiRuntimeConfig } from './runtimeConfig'

export type DomainId =
  | 'commonality'
  | 'lazyGiving'
  | 'alignment'
  | 'tally'
  | 'content-funding'
  | 'civility'
  | 'common-sense-majority'
  | 'conceptspace'

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

/** Default local gateway hosts when VITE_*_URL is unset (online tools still reachable). */
const localGatewayDefaults: Record<DomainId, string> = {
  commonality: 'http://commonality.localhost:8088/#/',
  lazyGiving: 'http://lazygiving.localhost:8088/#/',
  alignment: 'http://alignment.localhost:8088/#/',
  tally: 'http://tally.localhost:8088/#/',
  'content-funding': 'http://content-funding.localhost:8088/#/',
  civility: 'http://civility.localhost:8088/#/',
  'common-sense-majority': 'http://common-sense-majority.localhost:8088/#/',
  conceptspace: 'http://conceptspace.localhost:8088/#/',
}

export function getDomainUrl(domainId: DomainId, path = '/', fallbackHref = '#'): string {
  return resolveDomainUrlFromConfig(getRuntimeConfig(), domainId, path, fallbackHref)
}

export function resolveDomainUrlFromConfig(
  config: UiRuntimeConfig,
  domainId: DomainId,
  path = '/',
  fallbackHref = '#',
): string {
  const configuredBaseUrl = config[domainUrlKeys[domainId]] || localGatewayDefaults[domainId]
  if (!configuredBaseUrl) {
    return fallbackHref
  }
  return appendPathToBaseUrl(configuredBaseUrl, path)
}

function appendPathToBaseUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (baseUrl.includes('#')) {
    const [beforeHash, afterHash = ''] = baseUrl.split('#')
    const hashBase = afterHash.replace(/\/$/, '')
    if (normalizedPath === '/') {
      return `${beforeHash}#${hashBase || '/'}`
    }
    return `${beforeHash}#${hashBase}${normalizedPath}`
  }
  const trimmed = baseUrl.replace(/\/$/, '')
  return normalizedPath === '/' ? `${trimmed}/` : `${trimmed}${normalizedPath}`
}
