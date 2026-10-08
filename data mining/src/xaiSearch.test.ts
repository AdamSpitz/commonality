import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  collectResponseText,
  collectResponseUrls,
  parseClaimLines,
  xaiGrokMine,
  xaiLiveSearch,
} from './xaiSearch.js'

describe('parseClaimLines', () => {
  it('strips numbering and trailing source URLs', () => {
    const rows = parseClaimLines([
      '1. I want 10,000 new homes near transit in Denver by 2030. | https://x.com/example/status/1',
      'Everyone should have a quality place to call home. (https://example.org/housing)',
      'https://example.org/skip-me',
    ].join('\n'))
    assert.equal(rows.length, 2)
    assert.match(rows[0]!.text, /Denver/)
    assert.equal(rows[0]!.url, 'https://x.com/example/status/1')
    assert.equal(rows[1]!.url, 'https://example.org/housing')
  })
})

describe('collectResponseText / urls', () => {
  it('prefers output_text and gathers citations', () => {
    const json = {
      output_text: 'I want more neighborhood gardens.',
      citations: ['https://example.org/a'],
    }
    assert.equal(collectResponseText(json), 'I want more neighborhood gardens.')
    assert.deepEqual(collectResponseUrls(json), ['https://example.org/a'])
  })

  it('walks output content when output_text is missing', () => {
    const json = {
      output: [{
        type: 'message',
        content: [{
          type: 'output_text',
          text: 'I want Bowling Green to stay walkable.',
          annotations: [{ url: 'https://x.com/i/web/status/2' }],
        }],
      }],
    }
    assert.match(collectResponseText(json), /Bowling Green/)
    assert.deepEqual(collectResponseUrls(json), ['https://x.com/i/web/status/2'])
  })
})

describe('xaiLiveSearch', () => {
  it('posts x_search and extracts signable claims', async () => {
    const original = globalThis.fetch
    let captured: { url: string; body: Record<string, unknown> } | undefined
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      captured = {
        url: String(input),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      }
      return new Response(JSON.stringify({
        output_text: 'I want 285,000 homes in Toronto by 2031. | https://x.com/example/status/9',
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch
    try {
      const examples = await xaiLiveSearch({
        env: { XAI_API_KEY: 'xai-test' },
        tool: 'x_search',
        query: 'housing',
        types: ['goal', 'plank'],
        sourceId: 'x',
        sourceName: 'X (xAI x_search)',
      })
      assert.equal(captured?.url, 'https://api.x.ai/v1/responses')
      assert.equal((captured?.body.tools as Array<{ type: string }>)[0]?.type, 'x_search')
      assert.ok(examples.some((row) => /Toronto/i.test(row.text)))
      assert.equal(examples[0]?.url, 'https://x.com/example/status/9')
    } finally {
      globalThis.fetch = original
    }
  })
})

describe('xaiGrokMine', () => {
  it('posts to responses without tools', async () => {
    const original = globalThis.fetch
    let captured: { body: Record<string, unknown> } | undefined
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      captured = { body: JSON.parse(String(init?.body)) as Record<string, unknown> }
      return new Response(JSON.stringify({
        output_text: 'Housing is a human right. | https://example.org/right',
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch
    try {
      const examples = await xaiGrokMine({
        env: { grok_api_key: 'xai-test' },
        query: 'housing',
        types: ['belief', 'plank'],
      })
      assert.equal(captured?.body.tools, undefined)
      assert.ok(examples.some((row) => /human right/i.test(row.text)))
      assert.equal(examples[0]?.sourceId, 'grok')
    } finally {
      globalThis.fetch = original
    }
  })

  it('puts the geographic scale into the prompt when filtered', async () => {
    const original = globalThis.fetch
    let captured: { body: Record<string, unknown> } | undefined
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      captured = { body: JSON.parse(String(init?.body)) as Record<string, unknown> }
      return new Response(JSON.stringify({
        output_text: 'I want the City of Denver to rezone for mid-rise near transit.',
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch
    try {
      await xaiGrokMine({
        env: { XAI_API_KEY: 'xai-test' },
        query: 'housing',
        types: ['goal', 'plank'],
        geoLevels: ['town'],
      })
      const input = captured?.body.input as Array<{ content?: string }>
      assert.match(input[0]?.content ?? '', /Geographic scale: only Town/)
      assert.doesNotMatch(input[0]?.content ?? '', /Neighborhood/)
    } finally {
      globalThis.fetch = original
    }
  })
})
