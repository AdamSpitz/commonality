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

console.log('cloudflare service gateway tests passed')
