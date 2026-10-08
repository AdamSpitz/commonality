import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { inferGeoLevel } from './geo.js'
import { configuredSources, mine } from './sources.js'

const corpusDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../mined data')

describe('configuredSources', () => {
  it('lights up X, Google, and Grok when an xAI key is present', () => {
    const kinds = configuredSources({ grok_api_key: 'xai-test' })
    assert.equal(kinds.find((row) => row.id === 'x')?.configured, true)
    assert.equal(kinds.find((row) => row.id === 'google')?.configured, true)
    assert.equal(kinds.find((row) => row.id === 'grok')?.configured, true)
  })

  it('leaves X, Google, and Grok dark without keys', () => {
    const kinds = configuredSources({})
    assert.equal(kinds.find((row) => row.id === 'x')?.configured, false)
    assert.equal(kinds.find((row) => row.id === 'google')?.configured, false)
    assert.equal(kinds.find((row) => row.id === 'grok')?.configured, false)
  })
})

describe('local-corpus miner', () => {
  it('finds Bowling Green rows from the existing markdown', async () => {
    const result = await mine({
      query: 'Bowling Green',
      types: ['goal', 'plank', 'cause', 'belief'],
      sources: ['local-corpus'],
    }, { corpusDir })
    assert.equal(result.errors.length, 0)
    assert.ok(result.examples.length > 0)
    assert.ok(result.examples.some((row) => /Bowling Green/i.test(row.text)))
  })

  it('drops global-scale rows when only town is selected', async () => {
    const result = await mine({
      query: 'housing',
      types: ['goal', 'plank', 'belief', 'cause'],
      sources: ['local-corpus'],
      geoLevels: ['town'],
    }, { corpusDir })
    assert.ok(result.examples.length > 0)
    assert.ok(!result.examples.some((row) => inferGeoLevel(row.text) === 'global'))
    assert.ok(!result.examples.some((row) => inferGeoLevel(row.text) === 'national'))
  })
})

describe('xAI fallbacks', () => {
  it('mines X via x_search when no bearer token is set', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { tools?: Array<{ type: string }> }
      assert.equal(body.tools?.[0]?.type, 'x_search')
      return new Response(JSON.stringify({
        output_text: 'I want 10,000 new homes near transit in Denver by 2030.',
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch
    try {
      const result = await mine({
        query: 'housing',
        types: ['goal', 'plank'],
        sources: ['x'],
      }, { corpusDir, env: { XAI_API_KEY: 'xai-test' } })
      assert.equal(result.errors.length, 0)
      assert.ok(result.examples.some((row) => /Denver/i.test(row.text)))
    } finally {
      globalThis.fetch = original
    }
  })

  it('mines Grok without live-search tools', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { tools?: unknown }
      assert.equal(body.tools, undefined)
      return new Response(JSON.stringify({
        output_text: 'I want every city to zone for 50,000 new homes near transit by 2035.',
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch
    try {
      const result = await mine({
        query: 'housing',
        types: ['goal', 'plank'],
        sources: ['grok'],
      }, { corpusDir, env: { XAI_API_KEY: 'xai-test' } })
      assert.equal(result.errors.length, 0)
      assert.ok(result.examples.some((row) => /50,000 new homes/i.test(row.text)))
      assert.equal(result.examples[0]?.sourceId, 'grok')
    } finally {
      globalThis.fetch = original
    }
  })

  it('mines Google via web_search when CSE is missing', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { tools?: Array<{ type: string }> }
      assert.equal(body.tools?.[0]?.type, 'web_search')
      return new Response(JSON.stringify({
        output_text: 'Everyone should have a quality place to call home.',
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch
    try {
      const result = await mine({
        query: 'housing',
        types: ['belief', 'plank'],
        sources: ['google'],
      }, { corpusDir, env: { grok_api_key: 'xai-test' } })
      assert.equal(result.errors.length, 0)
      assert.ok(result.examples.some((row) => /quality place/i.test(row.text)))
    } finally {
      globalThis.fetch = original
    }
  })
})

