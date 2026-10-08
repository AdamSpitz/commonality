import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createMiningApp } from './app.js'

describe('mining app catalog', () => {
  it('lists artifact types and sources', async () => {
    const app = createMiningApp()
    const server = app.listen(0)
    try {
      const { port } = server.address() as { port: number }
      const res = await fetch(`http://127.0.0.1:${port}/api/catalog`)
      const body = await res.json() as {
        artifacts: Array<{ id: string }>
        sources: Array<{ id: string }>
        geoLevels: Array<{ id: string }>
      }
      assert.equal(res.status, 200)
      assert.ok(body.artifacts.some((row) => row.id === 'plank'))
      assert.ok(body.sources.some((row) => row.id === 'x'))
      assert.ok(body.sources.some((row) => row.id === 'google'))
      assert.ok(body.sources.some((row) => row.id === 'grok'))
      assert.deepEqual(body.geoLevels.map((row) => row.id), [
        'global',
        'national',
        'state-province',
        'county-parish',
        'town',
        'neighborhood',
      ])
    } finally {
      server.close()
    }
  })
})
