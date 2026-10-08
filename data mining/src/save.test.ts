import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { saveExamples } from './save.js'

describe('saveExamples', () => {
  it('appends jsonl and latest.json', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'mine-'))
    try {
      const result = saveExamples(dir, [{
        type: 'plank',
        text: 'I want more neighborhood gardens.',
        sourceId: 'test',
        sourceName: 'test',
      }])
      assert.equal(result.count, 1)
      const jsonl = readFileSync(path.join(dir, result.file), 'utf8')
      assert.match(jsonl, /neighborhood gardens/)
      const latest = JSON.parse(readFileSync(path.join(dir, 'latest.json'), 'utf8')) as unknown[]
      assert.equal(latest.length, 1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
