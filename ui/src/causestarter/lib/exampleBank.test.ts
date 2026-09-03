import { describe, expect, it } from 'vitest'
import { CAUSE_EXAMPLES, exampleAt, regenerateField } from './exampleBank'

describe('exampleBank', () => {
  it('has curated full examples', () => {
    expect(CAUSE_EXAMPLES.length).toBeGreaterThan(3)
    for (const example of CAUSE_EXAMPLES) {
      expect(example.name.length).toBeGreaterThan(2)
      expect(example.audience.length).toBeGreaterThan(2)
      expect(example.statement.length).toBeGreaterThan(12)
    }
  })

  it('exampleAt wraps indices', () => {
    expect(exampleAt(0)).toEqual(CAUSE_EXAMPLES[0])
    expect(exampleAt(CAUSE_EXAMPLES.length)).toEqual(CAUSE_EXAMPLES[0])
  })

  it('regenerates field values with context', () => {
    const name = regenerateField('name', { name: '', audience: 'park parents', statement: '' }, 1)
    expect(name.length).toBeGreaterThan(2)

    const audience = regenerateField(
      'audience',
      { name: 'Safer streets', audience: '', statement: '' },
      2,
    )
    expect(audience.toLowerCase()).toContain('safer streets')

    const statement = regenerateField(
      'statement',
      { name: 'Clean creek', audience: 'local families', statement: '' },
      3,
    )
    expect(statement.length).toBeGreaterThan(20)
  })
})
