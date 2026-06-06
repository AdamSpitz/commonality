import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { proxyUiRequest } from './ui-gateway.mjs'

const originalFetch = globalThis.fetch
const originalCaches = globalThis.caches

afterEach(() => {
  globalThis.fetch = originalFetch
  globalThis.caches = originalCaches
})

test('resolves IPNS through KV and caches immutable CID responses at the edge', async () => {
  const cacheStore = new Map()
  const kvStore = new Map()
  const fetches = []

  globalThis.caches = {
    default: {
      async match(request) {
        return cacheStore.get(request.url)?.clone()
      },
      async put(request, response) {
        cacheStore.set(request.url, response.clone())
      },
    },
  }

  globalThis.fetch = async (request) => {
    const url = typeof request === 'string' ? request : request.url
    fetches.push(url)
    if (url.startsWith('https://name.web3.storage/name/')) {
      return Response.json({ value: '/ipfs/bafy-test-cid' })
    }
    assert.equal(url, 'https://gateway.pinata.cloud/ipfs/bafy-test-cid/')
    return new Response('<html>ok</html>', { status: 200, headers: { 'content-type': 'text/html' } })
  }

  const env = {
    IPNS_ALIGNMENT: 'k51-test-edge-cache',
    PINATA_GATEWAY_ORIGIN: 'https://gateway.pinata.cloud',
    PINATA_GATEWAY_KEY: 'secret',
    CID_CACHE: {
      async get(key) {
        return kvStore.get(key)
      },
      async put(key, value) {
        kvStore.set(key, value)
      },
    },
  }

  const request = new Request('https://alignment.testnet.commonality.works/', {
    headers: { Accept: 'text/html' },
  })

  const first = await proxyUiRequest(request, env)
  assert.equal(first.status, 200)
  assert.equal(await first.text(), '<html>ok</html>')

  const second = await proxyUiRequest(request, env)
  assert.equal(second.status, 200)
  assert.equal(await second.text(), '<html>ok</html>')

  assert.deepEqual(fetches, [
    'https://name.web3.storage/name/k51-test-edge-cache',
    'https://gateway.pinata.cloud/ipfs/bafy-test-cid/',
  ])
  assert.equal(kvStore.get('ipns:k51-test-edge-cache'), 'bafy-test-cid')
})

test('falls back from a rate-limited gateway to a public CID gateway', async () => {
  const cacheStore = new Map()
  const fetchedUrls = []

  globalThis.caches = {
    default: {
      async match(request) {
        return cacheStore.get(request.url)?.clone()
      },
      async put(request, response) {
        cacheStore.set(request.url, response.clone())
      },
    },
  }

  globalThis.fetch = async (request) => {
    const url = typeof request === 'string' ? request : request.url
    fetchedUrls.push(url)
    if (url.startsWith('https://name.web3.storage/name/')) {
      return Response.json({ value: '/ipfs/bafy-fallback-cid' })
    }
    if (url === 'https://gateway.pinata.cloud/ipfs/bafy-fallback-cid/') {
      return new Response('rate limited', { status: 429 })
    }
    if (url === 'https://ipfs.io/ipfs/bafy-fallback-cid/') {
      return new Response('<html>public gateway</html>', { status: 200 })
    }
    throw new Error(`unexpected fetch: ${url}`)
  }

  const response = await proxyUiRequest(
    new Request('https://alignment.testnet.commonality.works/', {
      headers: { Accept: 'text/html' },
    }),
    {
      IPNS_ALIGNMENT: 'k51-test-rate-limit-fallback',
      PINATA_GATEWAY_ORIGIN: 'https://gateway.pinata.cloud',
    },
  )

  assert.equal(response.status, 200)
  assert.equal(await response.text(), '<html>public gateway</html>')
  assert.deepEqual(fetchedUrls, [
    'https://name.web3.storage/name/k51-test-rate-limit-fallback',
    'https://gateway.pinata.cloud/ipfs/bafy-fallback-cid/',
    'https://ipfs.io/ipfs/bafy-fallback-cid/',
  ])
})

test('falls back to index.html for browser navigation routes', async () => {
  const cacheStore = new Map()
  const fetchedUrls = []

  globalThis.caches = {
    default: {
      async match(request) {
        return cacheStore.get(request.url)?.clone()
      },
      async put(request, response) {
        cacheStore.set(request.url, response.clone())
      },
    },
  }

  globalThis.fetch = async (request) => {
    const url = typeof request === 'string' ? request : request.url
    fetchedUrls.push(url)
    if (url.startsWith('https://name.web3.storage/name/')) {
      return Response.json({ value: '/ipfs/bafy-spa-cid' })
    }
    if (url === 'https://gateway.pinata.cloud/ipfs/bafy-spa-cid/settings') {
      return new Response('not found', { status: 404 })
    }
    if (url === 'https://gateway.pinata.cloud/ipfs/bafy-spa-cid/index.html') {
      return new Response('<html>spa</html>', { status: 200, headers: { 'content-type': 'text/html' } })
    }
    throw new Error(`unexpected fetch: ${url}`)
  }

  const response = await proxyUiRequest(
    new Request('https://alignment.testnet.commonality.works/settings', {
      headers: { Accept: 'text/html' },
    }),
    {
      IPNS_ALIGNMENT: 'k51-test-spa-fallback',
      PINATA_GATEWAY_ORIGIN: 'https://gateway.pinata.cloud',
    },
  )

  assert.equal(response.status, 200)
  assert.equal(await response.text(), '<html>spa</html>')
  assert.deepEqual(fetchedUrls, [
    'https://name.web3.storage/name/k51-test-spa-fallback',
    'https://gateway.pinata.cloud/ipfs/bafy-spa-cid/settings',
    'https://gateway.pinata.cloud/ipfs/bafy-spa-cid/index.html',
  ])
})
