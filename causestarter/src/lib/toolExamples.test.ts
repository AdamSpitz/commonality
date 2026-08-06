import { describe, expect, it } from 'vitest'
import { SUPPORTING_TOOLS } from './tools'

describe('tool examples wiring', () => {
  it('maps tally and conceptspace to statement domains', () => {
    const tally = SUPPORTING_TOOLS.find((t) => t.id === 'tally')
    const conceptspace = SUPPORTING_TOOLS.find((t) => t.id === 'conceptspace')
    expect(tally?.domain).toBe('tally')
    expect(conceptspace?.domain).toBe('conceptspace')
  })

  it('has substrate tools that expect live examples', () => {
    const substrate = SUPPORTING_TOOLS.filter((t) => t.kind === 'substrate')
    expect(substrate.length).toBeGreaterThan(3)
  })
})
