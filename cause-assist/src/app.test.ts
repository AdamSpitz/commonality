import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, it } from 'mocha'
import { createCauseAssistApp } from './app.js'
import type { CauseAssistConfig } from './types.js'

const config: CauseAssistConfig = {
  apiBaseUrl: 'https://api.example.test/v1',
  suggestModel: 'test',
  safetyModel: 'test',
  implicationModel: 'test', coherenceModel: 'test',
  port: 0,
}

let server: Server | undefined

async function start(): Promise<string> {
  server = createCauseAssistApp(config).listen(0)
  await new Promise<void>((resolve) => server!.once('listening', resolve))
  const { port } = server.address() as AddressInfo
  return `http://127.0.0.1:${port}`
}

async function post(baseUrl: string, path: string, body: unknown, ip = '192.0.2.1') {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

afterEach(async () => {
  if (!server) return
  await new Promise<void>((resolve, reject) => {
    server!.close((error) => (error ? reject(error) : resolve()))
  })
  server = undefined
})

describe('cause-assist request guards', () => {
  it('rejects oversized suggestion inputs and invalid requested counts', async () => {
    const baseUrl = await start()

    const oversized = await post(baseUrl, '/suggest-statements', { goal: 'x'.repeat(2_001) })
    assert.equal(oversized.status, 400)

    const tooManyExisting = await post(
      baseUrl,
      '/suggest-statements',
      { goal: 'A valid main statement', existingStatements: Array(21).fill('existing') },
    )
    assert.equal(tooManyExisting.status, 400)

    const invalidCount = await post(
      baseUrl,
      '/suggest-statements',
      { goal: 'A valid main statement', count: 6 },
    )
    assert.equal(invalidCount.status, 400)
  })

  it('caps implication fan-out and validates every statement', async () => {
    const baseUrl = await start()

    const tooMany = await post(baseUrl, '/check-implications', {
      mainStatement: 'A valid main statement',
      supportingStatements: Array(21).fill('supporting'),
    })
    assert.equal(tooMany.status, 400)

    const emptyEntry = await post(baseUrl, '/check-implications', {
      mainStatement: 'A valid main statement',
      supportingStatements: [''],
    })
    assert.equal(emptyEntry.status, 400)
  })

  it('caps safety batches and statement lengths', async () => {
    const baseUrl = await start()

    const tooMany = await post(baseUrl, '/safety-check', {
      items: Array(21).fill({ text: 'safe text' }),
    })
    assert.equal(tooMany.status, 400)

    const oversized = await post(baseUrl, '/safety-check', {
      items: [{ text: 'x'.repeat(2_001) }],
    })
    assert.equal(oversized.status, 400)
  })

  it('validates plank-first endpoints and preserves anchor disjuncts', async () => {
    const baseUrl = await start()
    assert.equal((await post(baseUrl, '/atomize', { description: '' })).status, 400)
    assert.equal((await post(baseUrl, '/sharpen-plank', { plank: '' })).status, 400)
    assert.equal((await post(baseUrl, '/draft-anchor', { planks: ['only one'] })).status, 400)

    const planks = ['The creek should be clean.', 'Oak Street should be safe at night.']
    const response = await post(baseUrl, '/draft-anchor', { planks })
    assert.equal(response.status, 200)
    const body = await response.json() as { anchor: string; disjuncts: string[]; implicationChecks: unknown[] }
    assert.deepEqual(body.disjuncts, planks)
    assert.ok(planks.every((plank) => body.anchor.includes(plank)))
    assert.equal(body.implicationChecks.length, 2)
  })

  it('validates mediator scaffold requests and returns an offline editable shell', async () => {
    const baseUrl = await start()
    assert.equal((await post(baseUrl, '/suggest-mediator-scaffold', { foundingStatement: '' })).status, 400)
    const response = await post(baseUrl, '/suggest-mediator-scaffold', {
      foundingStatement: 'Neighbors should be able to walk safely at night.',
      name: 'Night walk mediator',
    })
    assert.equal(response.status, 200)
    const body = await response.json() as Record<string, unknown>
    assert.equal(body.source, 'fallback')
    assert.deepEqual(body.anchorClusters, [])
    assert.equal((body.identity as { name: string }).name, 'Night walk mediator')
    assert.equal('strategyPrompt' in body, false)
  })

  it('exposes coherence attester configuration on health', async () => {
    const baseUrl = await start()
    const response = await fetch(`${baseUrl}/health`)
    assert.equal(response.status, 200)
    const body = await response.json() as {
      coherenceAttesterConfigured: boolean
      coherenceAttesterAddress: string | null
    }
    assert.equal(body.coherenceAttesterConfigured, false)
    assert.equal(body.coherenceAttesterAddress, null)
  })

  it('does not expose the operator chain-write route', async () => {
    const baseUrl = await start()
    const response = await post(baseUrl, '/attest-coherence', {
      rosterCid: 'bafytestroster',
      title: 'Neighborhood parks',
      summary: 'We want more local parks and green space for families.',
      plankCids: ['bafkreiplank1'],
    })
    assert.equal(response.status, 404)
  })

  it('rate limits repeated expensive requests by client IP', async () => {
    const baseUrl = await start()
    const ip = '198.51.100.77'

    for (let index = 0; index < 20; index += 1) {
      const response = await post(
        baseUrl,
        '/suggest-statements',
        { goal: 'A valid main statement', count: 1 },
        ip,
      )
      assert.equal(response.status, 200)
    }

    const limited = await post(
      baseUrl,
      '/suggest-statements',
      { goal: 'A valid main statement', count: 1 },
      ip,
    )
    assert.equal(limited.status, 429)
    assert.equal((await limited.json() as { error: string }).error, 'rate_limit_exceeded')
  })
})
