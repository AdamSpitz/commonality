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

test('skips a hanging public gateway instead of waiting until the Worker 504s', async () => {
  const fetchedUrls = []
  globalThis.caches = undefined
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url
    const signal = init?.signal ?? input.signal
    fetchedUrls.push(url)
    if (url.startsWith('https://name.web3.storage/name/')) {
      return Response.json({ value: '/ipfs/bafy-timeout-cid' })
    }
    if (url === 'https://gateway.pinata.cloud/ipfs/bafy-timeout-cid/') {
      return new Response('HTML not allowed on public gateway', { status: 403 })
    }
    if (url === 'https://ipfs.io/ipfs/bafy-timeout-cid/') {
      return new Promise((_, reject) => {
        const abort = () => reject(signal?.reason ?? new Error('aborted'))
        if (signal?.aborted) {
          abort()
          return
        }
        signal?.addEventListener('abort', abort, { once: true })
      })
    }
    if (url === 'https://w3s.link/ipfs/bafy-timeout-cid/') {
      return new Response('<html>fallback</html>', { status: 200 })
    }
    throw new Error(`unexpected fetch: ${url}`)
  }

  const response = await proxyUiRequest(
    new Request('https://testnet.commonality.works/', {
      headers: { Accept: 'text/html' },
    }),
    {
      IPNS_COMMONALITY: 'k51-test-timeout',
      PINATA_GATEWAY_ORIGIN: 'https://gateway.pinata.cloud',
    },
  )

  assert.equal(response.status, 200)
  assert.equal(await response.text(), '<html>fallback</html>')
  assert.deepEqual(fetchedUrls, [
    'https://name.web3.storage/name/k51-test-timeout',
    'https://gateway.pinata.cloud/ipfs/bafy-timeout-cid/',
    'https://ipfs.io/ipfs/bafy-timeout-cid/',
    'https://w3s.link/ipfs/bafy-timeout-cid/',
  ])
})

test('serves /test-data from the dedicated test-data IPNS name', async () => {
  const fetches = []
  globalThis.caches = undefined
  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.url
    fetches.push(url)
    if (url === 'https://name.web3.storage/name/k51-test-data') {
      return Response.json({ value: '/ipfs/bafy-test-data-cid' })
    }
    if (url.startsWith('https://name.web3.storage/name/')) {
      throw new Error(`resolved UI IPNS instead of test-data: ${url}`)
    }
    assert.equal(url, 'https://ipfs-origin.testnet.commonality.works/ipfs/bafy-test-data-cid/registry.enc.json')
    return new Response('{"schema":"commonality-test-data-encrypted-v1"}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  const response = await proxyUiRequest(
    new Request('https://testnet.commonality.works/test-data/registry.enc.json'),
    {
      IPNS_COMMONALITY: 'k51-test-commonality',
      IPNS_TEST_DATA: 'k51-test-data',
      PINATA_GATEWAY_ORIGIN: 'https://ipfs-origin.testnet.commonality.works',
      PINATA_GATEWAY_KEY: 'secret',
    },
  )

  assert.equal(response.status, 200)
  assert.equal(fetches[0], 'https://name.web3.storage/name/k51-test-data')
})

test('sends the Pinata gateway token to a custom-domain origin', async () => {
  const seen = []
  globalThis.caches = undefined
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url
    const headers = init?.headers ?? input.headers
    seen.push({ url, token: headers?.get?.('x-pinata-gateway-token') ?? null })
    if (url.startsWith('https://name.web3.storage/name/')) {
      return Response.json({ value: '/ipfs/bafy-custom-cid' })
    }
    if (url === 'https://ipfs-origin.testnet.commonality.works/ipfs/bafy-custom-cid/') {
      assert.equal(headers.get('x-pinata-gateway-token'), 'secret')
      return new Response('<html>custom</html>', { status: 200 })
    }
    throw new Error(`unexpected fetch: ${url}`)
  }

  const response = await proxyUiRequest(
    new Request('https://testnet.commonality.works/', {
      headers: { Accept: 'text/html' },
    }),
    {
      IPNS_COMMONALITY: 'k51-test-custom-domain',
      PINATA_GATEWAY_ORIGIN: 'https://ipfs-origin.testnet.commonality.works',
      PINATA_GATEWAY_KEY: 'secret',
    },
  )

  assert.equal(response.status, 200)
  assert.equal(await response.text(), '<html>custom</html>')
  assert.equal(seen[1].token, 'secret')
})

test('resolves the testnet apex like the other UI hosts', async () => {
  const fetches = []
  globalThis.caches = undefined
  globalThis.fetch = async (request) => {
    const url = typeof request === 'string' ? request : request.url
    fetches.push(url)
    if (url.startsWith('https://name.web3.storage/name/')) {
      return Response.json({ value: '/ipfs/bafy-commonality-cid' })
    }
    assert.equal(url, 'https://gateway.pinata.cloud/ipfs/bafy-commonality-cid/')
    return new Response('<html>commonality</html>', { status: 200 })
  }

  const response = await proxyUiRequest(
    new Request('https://testnet.commonality.works/', {
      headers: { Accept: 'text/html' },
    }),
    {
      IPNS_COMMONALITY: 'k51-test-commonality',
      PINATA_GATEWAY_ORIGIN: 'https://gateway.pinata.cloud',
    },
  )

  assert.equal(response.status, 200)
  assert.equal(await response.text(), '<html>commonality</html>')
  assert.equal(fetches[0], 'https://name.web3.storage/name/k51-test-commonality')
})
