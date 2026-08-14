import { describe, expect, it } from 'vitest'
import { SUPPORTING_TOOLS, toolsForLevers } from './tools'

describe('toolsForLevers', () => {
  it('returns substrate tools that match selected levers', () => {
    const tools = toolsForLevers(['supporters', 'funding'])
    expect(tools.length).toBeGreaterThan(0)
    expect(tools.every((tool) => tool.kind === 'substrate')).toBe(true)
    expect(tools.some((tool) => tool.id === 'delegation')).toBe(true)
    expect(tools.some((tool) => tool.id === 'projects')).toBe(false)
    expect(tools.some((tool) => tool.id === 'tally')).toBe(false)
    expect(tools.some((tool) => tool.id === 'lazyGiving')).toBe(false)
    expect(tools.some((tool) => tool.id === 'conceptspace')).toBe(false)
  })

  it('includes all substrate tools when no levers selected', () => {
    const tools = toolsForLevers([])
    const substrateCount = SUPPORTING_TOOLS.filter((t) => t.kind === 'substrate').length
    expect(tools).toHaveLength(substrateCount)
  })

  it('does not route every founder to the CSM mediator as a generic tool', () => {
    expect(SUPPORTING_TOOLS.map((tool) => tool.id)).not.toContain('cause-mediator')
  })

  it('hosts Content Funding inside CauseStarter rather than linking out', () => {
    const tool = SUPPORTING_TOOLS.find((t) => t.id === 'content-funding')
    expect(tool?.internalPath).toBe('/content-funding')
  })

  it('does not list removed product tools', () => {
    const ids = SUPPORTING_TOOLS.map((t) => t.id)
    expect(ids).not.toContain('tally')
    expect(ids).not.toContain('conceptspace')
    expect(ids).not.toContain('lazyGiving')
    expect(ids).not.toContain('alignment')
    expect(ids).not.toContain('projects')
  })
})
