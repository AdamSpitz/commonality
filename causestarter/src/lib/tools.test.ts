import { describe, expect, it } from 'vitest'
import { SUPPORTING_TOOLS, toolsForLevers } from './tools'

describe('toolsForLevers', () => {
  it('returns substrate tools that match selected levers', () => {
    const tools = toolsForLevers(['supporters', 'funding'])
    expect(tools.length).toBeGreaterThan(0)
    expect(tools.every((tool) => tool.kind === 'substrate')).toBe(true)
    expect(tools.some((tool) => tool.id === 'tally')).toBe(true)
    expect(tools.some((tool) => tool.id === 'lazyGiving')).toBe(true)
  })

  it('includes all substrate tools when no levers selected', () => {
    const tools = toolsForLevers([])
    const substrateCount = SUPPORTING_TOOLS.filter((t) => t.kind === 'substrate').length
    expect(tools).toHaveLength(substrateCount)
  })
})
