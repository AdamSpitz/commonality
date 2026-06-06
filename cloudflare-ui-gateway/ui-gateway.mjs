const IPNS_BY_SUBDOMAIN = {
  commonality: 'IPNS_COMMONALITY',
  lazygiving: 'IPNS_LAZYGIVING',
  alignment: 'IPNS_ALIGNMENT',
  tally: 'IPNS_TALLY',
  'content-funding': 'IPNS_CONTENT_FUNDING',
  civility: 'IPNS_CIVILITY',
  'common-sense-majority': 'IPNS_COMMON_SENSE_MAJORITY',
  conceptspace: 'IPNS_CONCEPTSPACE',
}

const CID_CACHE_TTL_SECONDS = 5 * 60
const CACHEABLE_STATUS_MIN = 200
const CACHEABLE_STATUS_MAX = 399
const EDGE_RESPONSE_TTL_SECONDS = 24 * 60 * 60
const BROWSER_RESPONSE_TTL_SECONDS = 60
const FALLBACK_GATEWAY_ORIGINS = ['https://ipfs.io', 'https://w3s.link']
const EDGE_CACHE_VERSION = 'v2'

// Best-effort per-isolate cache. This is only a fallback/latency optimization;
// it is not shared globally across Worker isolates.
const inMemoryCidCache = new Map()

export default {
  async fetch(request, env, ctx) {
    return proxyUiRequest(request, env, ctx)
  },
}

export async function proxyUiRequest(request, env, ctx = undefined) {
  const requestUrl = new URL(request.url)
  const subdomain = requestUrl.hostname.split('.')[0]
  const ipnsKey = IPNS_BY_SUBDOMAIN[subdomain]

  if (!ipnsKey) {
    return new Response(`Unknown UI subdomain: ${subdomain}`, { status: 404 })
  }

  const ipnsName = env[ipnsKey]
  if (!ipnsName) {
    return new Response(`Worker misconfigured: missing binding ${ipnsKey}`, { status: 500 })
  }

  const gatewayOrigins = getGatewayOrigins(env)
  if (gatewayOrigins.length === 0) {
    return new Response('Worker misconfigured: missing IPFS gateway origin', { status: 500 })
  }

  let cid
  try {
    cid = await resolveToCid(ipnsName, env)
  } catch (err) {
    return new Response(`Failed to resolve IPNS name: ${err.message}`, { status: 502 })
  }

  const upstreamUrls = gatewayOrigins.map((origin) => buildUpstreamUrl(origin, cid, requestUrl))
  return fetchThroughEdgeCache({ request, requestUrl, upstreamUrls, env, ctx })
}

function getGatewayOrigins(env) {
  const configured = env.IPFS_GATEWAY_ORIGINS
    ? env.IPFS_GATEWAY_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [env.PINATA_GATEWAY_ORIGIN].filter(Boolean)

  return [...new Set([...configured, ...FALLBACK_GATEWAY_ORIGINS])]
}

async function resolveToCid(ipnsName, env) {
  const now = Date.now()
  const inMemoryCached = inMemoryCidCache.get(ipnsName)
  if (inMemoryCached && now - inMemoryCached.resolvedAt < CID_CACHE_TTL_SECONDS * 1000) {
    return inMemoryCached.cid
  }

  const kvCache = env.CID_CACHE
  const kvKey = `ipns:${ipnsName}`
  if (kvCache) {
    const kvCid = await kvCache.get(kvKey)
    if (kvCid) {
      inMemoryCidCache.set(ipnsName, { cid: kvCid, resolvedAt: now })
      return kvCid
    }
  }

  const res = await fetch(`https://name.web3.storage/name/${ipnsName}`)
  if (!res.ok) throw new Error(`IPNS resolve failed: ${res.status}`)

  const { value } = await res.json()
  const cid = parseIpfsPathCid(value)
  if (!cid) throw new Error(`IPNS resolve returned unexpected value: ${value}`)

  inMemoryCidCache.set(ipnsName, { cid, resolvedAt: now })
  if (kvCache) {
    await kvCache.put(kvKey, cid, { expirationTtl: CID_CACHE_TTL_SECONDS })
  }
  return cid
}

function parseIpfsPathCid(value) {
  if (typeof value !== 'string') return undefined
  const match = value.match(/^\/ipfs\/([^/]+)/)
  return match?.[1]
}

function buildUpstreamUrl(gatewayOrigin, cid, requestUrl) {
  const upstreamUrl = new URL(`${gatewayOrigin}/ipfs/${cid}${requestUrl.pathname}`)
  upstreamUrl.search = requestUrl.search
  return upstreamUrl
}

async function fetchThroughEdgeCache({ request, requestUrl, upstreamUrls, env, ctx }) {
  if (!canUseEdgeCache(request)) {
    return fetchFromGateways({ request, requestUrl, upstreamUrls, env })
  }

  const edgeCache = globalThis.caches?.default
  if (!edgeCache) {
    return fetchFromGateways({ request, requestUrl, upstreamUrls, env })
  }

  const cacheKey = buildEdgeCacheKey(request, upstreamUrls[0])
  const cached = await edgeCache.match(cacheKey)
  if (cached) {
    return responseForOriginalMethod(request, cached)
  }

  let upstreamResponse = await fetchFromGateways({ request, requestUrl, upstreamUrls, env, forceGet: true })

  if (shouldTrySpaFallback(request, upstreamResponse, upstreamUrls[0])) {
    const fallbackUrls = upstreamUrls.map((upstreamUrl) => {
      const fallbackUrl = new URL(upstreamUrl)
      fallbackUrl.pathname = fallbackUrl.pathname.replace(/\/[^/]*$/, '/index.html')
      fallbackUrl.search = ''
      return fallbackUrl
    })
    const fallbackResponse = await fetchFromGateways({ request, requestUrl, upstreamUrls: fallbackUrls, env, forceGet: true })
    if (fallbackResponse.ok) {
      upstreamResponse = fallbackResponse
    }
  }

  if (isCacheable(upstreamResponse)) {
    const responseToCache = withCacheHeaders(upstreamResponse)
    const put = edgeCache.put(cacheKey, responseToCache.clone())
    if (ctx?.waitUntil) ctx.waitUntil(put)
    else await put
    return responseForOriginalMethod(request, responseToCache)
  }

  return responseForOriginalMethod(request, upstreamResponse)
}

function canUseEdgeCache(request) {
  return request.method === 'GET' || request.method === 'HEAD'
}

function buildEdgeCacheKey(request, upstreamUrl) {
  // Cache by immutable CID path, not by the gateway token-bearing upstream Request.
  // This keeps all hostnames out of the key except the actual CID/path being served.
  return new Request(`https://commonality-ui-cache.local/${EDGE_CACHE_VERSION}${upstreamUrl.pathname}${upstreamUrl.search}`, {
    method: 'GET',
    headers: {
      Accept: request.headers.get('Accept') ?? '',
    },
  })
}

async function fetchFromGateways({ request, requestUrl, upstreamUrls, env, forceGet = false }) {
  let lastResponse
  let lastError

  for (const upstreamUrl of upstreamUrls) {
    try {
      const response = await fetchFromGateway({ request, requestUrl, upstreamUrl, env, forceGet })
      console.log(JSON.stringify({ event: 'ipfsGatewayFetch', gateway: upstreamUrl.origin, path: upstreamUrl.pathname, status: response.status }))
      if (response.ok) return response
      lastResponse = response
      if (response.status === 404) return response
    } catch (err) {
      lastError = err
    }
  }

  if (lastResponse) return lastResponse
  throw lastError ?? new Error('No IPFS gateways configured')
}

async function fetchFromGateway({ request, requestUrl, upstreamUrl, env, forceGet = false }) {
  // Forward only the headers that matter for static content. In particular, do
  // not forward the browser Host/X-Forwarded-Host headers to public IPFS gateways:
  // if they receive alignment.testnet.commonality.works as the forwarded host,
  // they try DNSLink/IPNS for that host instead of serving the /ipfs/{cid} path
  // we constructed.
  const upstreamHeaders = new Headers()
  const accept = request.headers.get('Accept')
  if (accept) upstreamHeaders.set('Accept', accept)
  const range = request.headers.get('Range')
  if (range) upstreamHeaders.set('Range', range)
  upstreamHeaders.set('X-Commonality-Forwarded-Host', requestUrl.host)
  if (env.PINATA_GATEWAY_KEY && upstreamUrl.hostname.endsWith('pinata.cloud')) {
    upstreamHeaders.set('x-pinata-gateway-token', env.PINATA_GATEWAY_KEY)
  }

  return fetch(upstreamUrl.toString(), {
    body: request.body,
    headers: upstreamHeaders,
    method: forceGet && request.method === 'HEAD' ? 'GET' : request.method,
    redirect: 'follow',
  })
}

function shouldTrySpaFallback(request, response, upstreamUrl) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false
  if (response.status !== 404) return false
  if (!request.headers.get('Accept')?.includes('text/html')) return false
  return !upstreamUrl.pathname.endsWith('/index.html')
}

function isCacheable(response) {
  return response.status >= CACHEABLE_STATUS_MIN && response.status <= CACHEABLE_STATUS_MAX
}

function withCacheHeaders(response) {
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', `public, max-age=${BROWSER_RESPONSE_TTL_SECONDS}, s-maxage=${EDGE_RESPONSE_TTL_SECONDS}`)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

function responseForOriginalMethod(request, response) {
  if (request.method !== 'HEAD') return response
  return new Response(null, { status: response.status, statusText: response.statusText, headers: response.headers })
}
