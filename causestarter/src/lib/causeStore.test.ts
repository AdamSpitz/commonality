import { beforeEach, describe, expect, it } from 'vitest'
import {
  deleteCause,
  getCause,
  hasBlockingImplication,
  hasBlockingSafety,
  listCauses,
  markCauseLaunched,
  saveCause,
} from './causeStore'

describe('causeStore v2', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('saves goal-first drafts with statements', () => {
    const created = saveCause({
      goal: 'Make night walks safe on Oak Street.',
      statements: [
        {
          id: 's1',
          text: 'Lighting and watches reduce fear after dark.',
          origin: 'user',
          disposition: 'adopted',
        },
      ],
      levers: ['supporters', 'funding'],
    })

    expect(created.status).toBe('draft')
    expect(created.goal).toContain('Oak Street')
    expect(listCauses()).toHaveLength(1)
    expect(getCause(created.id)?.statements).toHaveLength(1)
  })

  it('marks a cause launched with statement CIDs', () => {
    const created = saveCause({
      goal: 'Clean the creek.',
      statements: [],
      levers: ['supporters'],
    })

    const launched = markCauseLaunched(created.id, 'bafygoal', ['bafysupport'])
    expect(launched?.status).toBe('launched')
    expect(launched?.statementCid).toBe('bafygoal')
    expect(launched?.statementCids).toEqual(['bafysupport'])
  })

  it('detects blocking implication only for adopted medium/high non-implies', () => {
    expect(hasBlockingImplication([{
      id: '1',
      text: 'extra policy',
      origin: 'user',
      disposition: 'adopted',
      implication: {
        implies: false,
        confidence: 'high',
        reasoning: 'S2 adds a claim',
        checkedAt: '',
      },
    }])).toBe(true)

    expect(hasBlockingImplication([{
      id: '1',
      text: 'extra policy',
      origin: 'user',
      disposition: 'adopted',
      implication: {
        implies: false,
        confidence: 'low',
        reasoning: 'unchecked',
        checkedAt: '',
      },
    }])).toBe(false)

    expect(hasBlockingImplication([{
      id: '1',
      text: 'pending extra',
      origin: 'suggested',
      disposition: 'pending',
      implication: {
        implies: false,
        confidence: 'high',
        reasoning: 'S2 adds a claim',
        checkedAt: '',
      },
    }])).toBe(false)
  })

  it('detects blocking safety on goal or adopted statements only', () => {
    expect(hasBlockingSafety({
      goal: 'ok',
      goalSafety: { allowed: false, category: 'fraud_or_scam', explanation: 'no', checkedAt: '' },
      statements: [],
    })).toBe(true)

    expect(hasBlockingSafety({
      goal: 'ok',
      statements: [{
        id: '1',
        text: 'bad',
        origin: 'user',
        disposition: 'adopted',
        safety: { allowed: false, category: 'hate_or_harassment', explanation: 'no', checkedAt: '' },
      }],
    })).toBe(true)

    // Pending suggestions must not trap Continue / Save.
    expect(hasBlockingSafety({
      goal: 'ok',
      statements: [{
        id: '1',
        text: 'pending bad',
        origin: 'suggested',
        disposition: 'pending',
        safety: { allowed: false, category: 'hate_or_harassment', explanation: 'no', checkedAt: '' },
      }],
    })).toBe(false)

    expect(hasBlockingSafety({
      goal: 'ok',
      statements: [{
        id: '1',
        text: 'fine',
        origin: 'user',
        disposition: 'adopted',
        safety: { allowed: true, category: 'ok', explanation: '', checkedAt: '' },
      }],
    })).toBe(false)
  })

  it('deletes a local cause', () => {
    const created = saveCause({
      goal: 'Library hours.',
      statements: [],
      levers: ['supporters'],
    })
    deleteCause(created.id)
    expect(listCauses()).toHaveLength(0)
  })
})
