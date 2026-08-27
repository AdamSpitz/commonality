import { describe, expect, it } from 'vitest'
import {
  parseBoardInclusionRules,
  parseRelevantAreas,
  projectMatchesBoardRules,
} from './geographicInclusion'

describe('geographic board inclusion', () => {
  const ontario = { geographic: { within: ['Ontario', 'Canada'] } }

  it('includes a project declared in a nested place', () => {
    expect(projectMatchesBoardRules([
      ['Grey County', 'Ontario', 'Canada'],
    ], ontario)).toBe(true)
  })

  it('does not infer a match from a sibling or missing area', () => {
    expect(projectMatchesBoardRules([['Montréal', 'Quebec', 'Canada']], ontario)).toBe(false)
    expect(projectMatchesBoardRules(undefined, ontario)).toBe(false)
  })

  it('includes explicitly worldwide work and supports unscoped boards', () => {
    expect(projectMatchesBoardRules([['Worldwide']], ontario)).toBe(true)
    expect(projectMatchesBoardRules(undefined, undefined)).toBe(true)
  })

  it('parses only modest, valid published shapes', () => {
    expect(parseRelevantAreas([['Grey County', 'Ontario', 'Canada'], 'Worldwide'])).toEqual([
      ['Grey County', 'Ontario', 'Canada'],
      ['Worldwide'],
    ])
    expect(parseBoardInclusionRules({ geographic: { within: ['Ontario', 'Canada'] } })).toEqual(ontario)
    expect(parseBoardInclusionRules({ arbitrary: 'predicate' })).toBeUndefined()
  })
})
