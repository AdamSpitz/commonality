import { describe, expect, it } from 'vitest'
import { SUPPORTING_TOOLS } from './tools'

describe('tool examples wiring', () => {
  it('does not list Projects as a separate tool (cause detail has its own section)', () => {
    expect(SUPPORTING_TOOLS.some((t) => t.id === 'projects')).toBe(false)
  })

  it('has substrate tools that expect live examples', () => {
    const substrate = SUPPORTING_TOOLS.filter((t) => t.kind === 'substrate')
    expect(substrate.length).toBeGreaterThan(0)
    expect(
      substrate.every((t) => !['tally', 'conceptspace', 'lazyGiving', 'projects'].includes(t.id)),
    ).toBe(true)
  })
})