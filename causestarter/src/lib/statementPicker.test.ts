import { describe, expect, it } from 'vitest'
import type { StatementListItem } from '@commonality/sdk/conceptspace'
import {
  existingPlanksForAtomize,
  MAX_EXISTING_PLANKS_FOR_ATOMIZE,
  parseTrustedNudgerAddresses,
  rankStatementMatches,
} from './statementPicker'

const statement = (cid: string, title: string, believerCount = 0): StatementListItem => ({
  id: cid, cid: cid as StatementListItem['cid'], title, excerpt: title,
  statementType: '', believerCount, disbelieverCount: 0, createdAt: '',
})

describe('parseTrustedNudgerAddresses', () => {
  const address = `0x${'1'.repeat(40)}`

  it('accepts shared JSON entries and the comma-separated fallback', () => {
    expect(parseTrustedNudgerAddresses(JSON.stringify([{ address, name: 'Explorer' }]))).toEqual([address])
    expect(parseTrustedNudgerAddresses(`${address},not-an-address`)).toEqual([address])
  })
})

describe('existingPlanksForAtomize', () => {
  it('omits empty input and caps at the atomize limit', () => {
    expect(existingPlanksForAtomize(['', '  '])).toBeUndefined()
    expect(existingPlanksForAtomize([' keep me ', ''])).toEqual(['keep me'])
    const many = Array.from({ length: MAX_EXISTING_PLANKS_FOR_ATOMIZE + 5 }, (_, i) => `plank ${i}`)
    expect(existingPlanksForAtomize(many)).toHaveLength(MAX_EXISTING_PLANKS_FOR_ATOMIZE)
  })
})

describe('rankStatementMatches', () => {
  it('ranks lexical matches deterministically and excludes rejected statements', () => {
    const results = rankStatementMatches('safer school crossings', [
      statement('bafk-a', 'Safer crossings near every school', 2),
      statement('bafk-b', 'Public parks should stay open', 20),
      statement('bafk-c', 'School crossings should be repainted', 1),
    ], new Set(['bafk-a']))
    expect(results.map((item) => item.cid)).toEqual(['bafk-c'])
  })
})
