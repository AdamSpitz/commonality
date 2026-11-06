import assert from 'node:assert/strict'
import { matchRoute, proxyServiceRequest } from './service-gateway.mjs'

assert.deepEqual(matchRoute('/indexer/graphql'), {
  service: 'indexer',
  upstreamPath: '/graphql',
})

assert.deepEqual(matchRoute('/platform-api/content-submission'), {
  service: 'platform-api',
  upstreamPath: '/content-submission',
})

assert.deepEqual(matchRoute('/cause-assist/health'), {
  service: 'cause-assist',
  upstreamPath: '/health',
})

assert.equal(matchRoute('/unknown/health'), null)

const originalFetch = globalThis.fetch
const seen = []
globalThis.fetch = async request => {
  seen.push(request)
  return new Response('ok', { status: 200 })
}

try {
  const response = await proxyServiceRequest(
    new Request('https://services.testnet.commonality.works/attesters/content-attester?cid=abc', {
      method: 'POST',
      body: 'payload',
      headers: { 'Content-Type': 'text/plain' },
    }),
    {
      ATTESTERS_ORIGIN: 'https://commonality-service-host-attesters.onrender.com',
    },
  )

  assert.equal(response.status, 200)
  assert.equal(seen.length, 1)
  assert.equal(seen[0].url, 'https://commonality-service-host-attesters.onrender.com/content-attester?cid=abc')
  assert.equal(seen[0].method, 'POST')
  assert.equal(seen[0].headers.get('X-Commonality-Gateway-Service'), 'attesters')
  assert.equal(seen[0].headers.get('X-Forwarded-Host'), 'services.testnet.commonality.works')
} finally {
  globalThis.fetch = originalFetch
}

const notFound = await proxyServiceRequest(
  new Request('https://services.testnet.commonality.works/nope'),
  {},
)
assert.equal(notFound.status, 404)

const misconfigured = await proxyServiceRequest(
  new Request('https://services.testnet.commonality.works/workers/health'),
  {},
)
assert.equal(misconfigured.status, 500)

const cacheStore = new Map()
const cacheCalls = []
globalThis.caches = {
  default: {
    async match(request) {
      cacheCalls.push(['match', request.url])
      return cacheStore.get(request.url) ?? undefined
    },
    async put(request, response) {
      cacheCalls.push(['put', request.url, response.headers.get('cache-control')])
      cacheStore.set(request.url, response)
    },
  },
}

const segmentUrl = 'https://services.testnet.commonality.works/indexer/api/event-segments/31337/DirectSupport/0'
const manifestUrl = 'https://services.testnet.commonality.works/indexer/api/event-segments/manifest?chainId=31337&eventName=DirectSupport'
const seenCache = []
globalThis.fetch = async request => {
  seenCache.push(request.url)
  const immutable = String(request.url).includes('/api/event-segments/31337/')
  return new Response('segment', {
    status: 200,
    headers: { 'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=30' },
  })
}

const first = await proxyServiceRequest(new Request(segmentUrl), {
  INDEXER_ORIGIN: 'https://indexer.example',
})
assert.equal(first.headers.get('cache-control'), 'public, max-age=31536000, immutable')
assert.equal(seenCache.length, 1)
const second = await proxyServiceRequest(new Request(segmentUrl), {
  INDEXER_ORIGIN: 'https://indexer.example',
})
assert.equal(await second.text(), 'segment')
assert.equal(seenCache.length, 1)

const manifest = await proxyServiceRequest(new Request(manifestUrl), {
  INDEXER_ORIGIN: 'https://indexer.example',
})
assert.equal(manifest.headers.get('cache-control'), 'public, max-age=30')
assert.equal(seenCache.length, 2)
assert.equal(cacheCalls.some(call => call[0] === 'put' && String(call[1]).includes('/manifest')), false)

console.log('cloudflare service gateway tests passed')
