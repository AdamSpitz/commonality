const DEFAULT_ROUTE_PREFIXES = ['indexer', 'platform-api', 'attesters', 'workers']

const UPSTREAM_KEYS = {
  indexer: 'INDEXER_ORIGIN',
  'platform-api': 'PLATFORM_API_ORIGIN',
  attesters: 'ATTESTERS_ORIGIN',
  workers: 'WORKERS_ORIGIN',
}

export default {
  async fetch(request, env) {
    return proxyServiceRequest(request, env)
  },
}

export async function proxyServiceRequest(request, env) {
  const requestUrl = new URL(request.url)
  const route = matchRoute(requestUrl.pathname)

  if (!route) {
    return jsonResponse({
      error: 'not_found',
      message: `Expected one of: ${DEFAULT_ROUTE_PREFIXES.map(prefix => `/${prefix}`).join(', ')}`,
    }, 404)
  }

  const upstreamOrigin = env[UPSTREAM_KEYS[route.service]]
  if (!upstreamOrigin) {
    return jsonResponse({
      error: 'gateway_misconfigured',
      message: `Missing Cloudflare Worker binding ${UPSTREAM_KEYS[route.service]}`,
    }, 500)
  }

  const upstreamUrl = new URL(upstreamOrigin)
  upstreamUrl.pathname = joinPaths(upstreamUrl.pathname, route.upstreamPath)
  upstreamUrl.search = requestUrl.search

  const upstreamRequest = new Request(upstreamUrl, request)
  upstreamRequest.headers.set('X-Commonality-Gateway-Service', route.service)
  upstreamRequest.headers.set('X-Forwarded-Host', requestUrl.host)
  upstreamRequest.headers.set('X-Forwarded-Proto', requestUrl.protocol.replace(':', ''))

  return fetch(upstreamRequest)
}

export function matchRoute(pathname) {
  const withoutLeadingSlash = pathname.replace(/^\/+/, '')
  const [service, ...rest] = withoutLeadingSlash.split('/')

  if (!DEFAULT_ROUTE_PREFIXES.includes(service)) return null

  return {
    service,
    upstreamPath: `/${rest.join('/')}`,
  }
}

function joinPaths(basePath, nextPath) {
  const base = basePath === '/' ? '' : basePath.replace(/\/+$/, '')
  const next = nextPath.replace(/^\/+/, '')
  return `${base}/${next}`
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
