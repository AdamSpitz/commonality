import { beforeEach, describe, expect, it } from 'vitest'
import {
  causeTitle,
  createCause,
  deleteCause,
  getCause,
  hasBlockingSafety,
  isLive,
  listCauses,
  markPlankPublished,
  newPlank,
  publishedPlanks,
  unpublishedPlanks,
  updateCause,
  type CauseDraft,
} from './causeStore'

function causeWith(planks: Array<{ text: string; cid?: string }>): CauseDraft {
  const created = createCause()
  return updateCause(created.id, {
    planks: planks.map((plank) => ({ ...newPlank(plank.text), cid: plank.cid })),
  })!
}

describe('causeStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('creates a cause with no planks and no title of its own', () => {
    const created = createCause('Neighbors organizing for safer night walks.')
    expect(created.planks).toEqual([])
    // The seed is only ever an input to plank suggestion, never page content.
    expect(created.suggestionSeed).toContain('Neighbors organizing')
    expect(causeTitle(created)).toBe('Untitled cause')
    expect(listCauses()).toHaveLength(1)
  })

  it('titles a cause from its first plank', () => {
    const cause = causeWith([{ text: 'Oak Street gets working streetlights by June.' }])
    expect(causeTitle(cause)).toBe('Oak Street gets working streetlights by June.')
  })

  it('truncates a long first plank into a label', () => {
    const cause = causeWith([{
      text: 'Every residential street in the North End is lit to the city standard within two years.',
    }])
    expect(causeTitle(cause).length).toBeLessThanOrEqual(46)
    expect(causeTitle(cause).endsWith('…')).toBe(true)
  })

  it('ignores blank planks when titling and counting', () => {
    const cause = causeWith([{ text: '   ' }, { text: 'Crosswalks repainted before winter.' }])
    expect(causeTitle(cause)).toBe('Crosswalks repainted before winter.')
    expect(unpublishedPlanks(cause)).toHaveLength(1)
  })

  it('separates published planks from unpublished ones', () => {
    const cause = causeWith([
      { text: 'Streetlights repaired.', cid: 'bafyone' },
      { text: 'Crosswalks repainted.' },
    ])
    expect(publishedPlanks(cause).map((p) => p.cid)).toEqual(['bafyone'])
    expect(unpublishedPlanks(cause).map((p) => p.text)).toEqual(['Crosswalks repainted.'])
  })

  it('treats a cause as live once any plank is on chain — there is no launch event', () => {
    const draft = causeWith([{ text: 'Streetlights repaired.' }])
    expect(isLive(draft)).toBe(false)

    const published = markPlankPublished(draft.id, draft.planks[0]!.id, 'bafyone')!
    expect(isLive(published)).toBe(true)
    expect(getCause(draft.id)?.planks[0]?.cid).toBe('bafyone')
  })

  it('publishes planks one at a time, leaving the others untouched', () => {
    const cause = causeWith([{ text: 'First plank.' }, { text: 'Second plank.' }])
    const after = markPlankPublished(cause.id, cause.planks[1]!.id, 'bafytwo')!
    expect(after.planks[0]?.cid).toBeUndefined()
    expect(after.planks[1]?.cid).toBe('bafytwo')
  })

  it('persists the optional founder mediator identity and service URL', () => {
    const created = createCause()
    updateCause(created.id, {
      mediator: {
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        serviceUrl: 'https://housing.example/mediator',
        name: 'Housing mediator',
        description: 'Bridges homeowners and renters.',
      },
    })
    expect(getCause(created.id)?.mediator?.serviceUrl).toBe('https://housing.example/mediator')

    updateCause(created.id, { mediator: undefined })
    expect(getCause(created.id)?.mediator).toBeUndefined()
  })

  it('detects blocking safety only on planks that have text', () => {
    const blocked = causeWith([{ text: 'bad' }])
    expect(hasBlockingSafety(updateCause(blocked.id, {
      planks: blocked.planks.map((plank) => ({
        ...plank,
        safety: { allowed: false, category: 'hate_or_harassment', explanation: 'no', checkedAt: '' },
      })),
    })!)).toBe(true)

    const empty = causeWith([{ text: '  ' }])
    expect(hasBlockingSafety(updateCause(empty.id, {
      planks: empty.planks.map((plank) => ({
        ...plank,
        safety: { allowed: false, category: 'hate_or_harassment', explanation: 'no', checkedAt: '' },
      })),
    })!)).toBe(false)

    const fine = causeWith([{ text: 'Streetlights repaired.' }])
    expect(hasBlockingSafety(fine)).toBe(false)
  })

  it('deletes a local cause', () => {
    const created = createCause()
    deleteCause(created.id)
    expect(listCauses()).toHaveLength(0)
  })
})
