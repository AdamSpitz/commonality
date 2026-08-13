import { describe, expect, it } from 'vitest'
import type { StatementListItem } from '@commonality/sdk/conceptspace'
import { rankStatementMatches } from './statementPicker'

const statement = (cid: string, title: string, believerCount = 0): StatementListItem => ({
  id: cid, cid: cid as StatementListItem['cid'], title, excerpt: title,
  statementType: '', believerCount, disbelieverCount: 0, createdAt: '',
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
