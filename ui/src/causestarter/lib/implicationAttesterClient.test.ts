import { describe, expect, it } from 'vitest'
import { formatPairSummary, type AttesterPairResult } from './implicationAttesterClient'

describe('formatPairSummary', () => {
  it('distinguishes attested, refused, and failed pairs', () => {
    const results: AttesterPairResult[] = [
      {
        fromCid: 'bafyfromaaaa',
        toCid: 'bafytobbbbbb',
        success: true,
        decision: true,
        confidence: 'high',
        transactionHash: '0xabc',
      },
      {
        fromCid: 'bafyfromcccc',
        toCid: 'bafytodddddd',
        success: true,
        decision: false,
        confidence: 'medium',
        explanation: 'different subjects',
      },
      {
        fromCid: 'bafyfromeeee',
        toCid: 'bafytoffffff',
        success: false,
        error: 'statement_not_found',
      },
    ]
    const summary = formatPairSummary(results)
    expect(summary).toMatch(/Attested/)
    expect(summary).toMatch(/Does not imply/)
    expect(summary).toMatch(/statement_not_found/)
  })
})
