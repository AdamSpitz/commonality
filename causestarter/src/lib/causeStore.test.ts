import { beforeEach, describe, expect, it } from 'vitest'
import {
  bookmarkCause,
  causeContentBoardPath,
  causePath,
  causeTitle,
  createCause,
  deleteCause,
  findCauseByStable,
  forgetUnsavedCauses,
  getCause,
  hasBlockingSafety,
  isCauseBookmarked,
  isEmptyDraft,
  isLive,
  listCauses,
  markPlankPublished,
  publishedBookmarkIds,
  newPlank,
  publishedPlanks,
  unbookmarkCause,
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
    forgetUnsavedCauses()
  })

  it('creates a cause with no planks and no title of its own', () => {
    const created = createCause('Neighbors organizing for safer night walks.')
    expect(created.planks).toEqual([])
    // The seed is only ever an input to plank suggestion, never page content.
    expect(created.suggestionSeed).toContain('Neighbors organizing')
    expect(causeTitle(created)).toBe('Untitled cause')
    expect(isEmptyDraft(created)).toBe(true)
    expect(listCauses()).toHaveLength(0)
    expect(window.localStorage.getItem('causestarter.causes.v3')).toBeNull()
    expect(getCause(created.id)?.id).toBe(created.id)
  })

  it('puts the content board under the cause share path', () => {
    const local = createCause()
    updateCause(local.id, { title: 'Safer nights' })
    expect(causeContentBoardPath(getCause(local.id)!)).toBe(`${causePath(getCause(local.id)!)}/content`)
  })

  it('does not persist a draft until it has a title, summary, or plank text', () => {
    const created = createCause()
    expect(listCauses()).toHaveLength(0)

    updateCause(created.id, { title: 'Safer nights' })
    expect(listCauses().map((cause) => cause.id)).toEqual([created.id])
    expect(JSON.parse(window.localStorage.getItem('causestarter.causes.v3')!)).toHaveLength(1)
  })

  it('drops leftover empty drafts from storage and the list', () => {
    window.localStorage.setItem('causestarter.causes.v3', JSON.stringify([
      {
        id: 'empty-leftover',
        planks: [{ id: 'blank', text: '   ', origin: 'user' }],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'real-cause',
        title: 'Working streetlights',
        planks: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
      },
    ]))

    expect(listCauses().map((cause) => cause.id)).toEqual(['real-cause'])
    expect(getCause('empty-leftover')).toBeUndefined()
    expect(JSON.parse(window.localStorage.getItem('causestarter.causes.v3')!)).toEqual([
      expect.objectContaining({ id: 'real-cause' }),
    ])
  })

  it('removes a persisted draft from storage if it is emptied again', () => {
    const created = createCause()
    updateCause(created.id, { planks: [newPlank('Streetlights repaired.')] })
    expect(listCauses()).toHaveLength(1)

    updateCause(created.id, { planks: [] })
    expect(listCauses()).toHaveLength(0)
    expect(window.localStorage.getItem('causestarter.causes.v3')).toBeNull()
    expect(getCause(created.id)?.planks).toEqual([])
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

  it('stores the exact wording associated with a newly published CID', () => {
    const cause = causeWith([{ text: 'A later local edit.' }])
    const after = markPlankPublished(
      cause.id,
      cause.planks[0]!.id,
      'bafyexact',
      'The exact published wording.',
    )!
    expect(after.planks[0]).toMatchObject({
      text: 'The exact published wording.',
      cid: 'bafyexact',
    })
  })

  it('migrates v2 causes to planks without losing feasible founder data', () => {
    window.localStorage.setItem('causestarter.causes.v2', JSON.stringify([{
      id: 'old-cause',
      description: 'A rough founder description.',
      goal: 'The old primary goal.',
      statements: [
        {
          id: 'adopted',
          text: 'An adopted supporting issue.',
          origin: 'suggested',
          disposition: 'adopted',
          rationale: 'Why this issue matters.',
          safety: { allowed: true, category: 'ok', explanation: '', checkedAt: 'then' },
        },
        {
          id: 'second-adopted',
          text: 'A second adopted issue.',
          origin: 'user',
          disposition: 'adopted',
        },
        {
          id: 'pending',
          text: 'A pending issue.',
          origin: 'user',
          disposition: 'pending',
        },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      statementCid: 'bafyprimary',
      statementCids: ['bafysupporting'],
      goalSafety: { allowed: true, category: 'ok', explanation: '', checkedAt: 'then' },
      mediator: {
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        serviceUrl: 'https://example.test/mediator',
        name: 'Example mediator',
        description: 'Connects participants.',
      },
    }]))

    const migrated = getCause('old-cause')!
    expect(migrated).toMatchObject({
      id: 'old-cause',
      suggestionSeed: 'A rough founder description.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      mediator: { name: 'Example mediator' },
    })
    expect(migrated.planks).toEqual([
      expect.objectContaining({ text: 'The old primary goal.' }),
      expect.objectContaining({
        id: 'adopted',
        text: 'An adopted supporting issue.',
        cid: 'bafyprimary',
        rationale: 'Why this issue matters.',
      }),
      expect.objectContaining({
        id: 'second-adopted',
        text: 'A second adopted issue.',
        cid: 'bafysupporting',
      }),
      expect.objectContaining({ id: 'pending', text: 'A pending issue.' }),
    ])
    expect(window.localStorage.getItem('causestarter.causes.v2')).toBeNull()
    expect(window.localStorage.getItem('causestarter.causes.v3')).not.toBeNull()
  })

  it('does not duplicate a v2 goal that is also the primary adopted statement', () => {
    window.localStorage.setItem('causestarter.causes.v2', JSON.stringify([{
      id: 'duplicate-primary',
      goal: 'The primary issue.',
      statements: [
        { id: 'primary', text: 'The primary issue.', origin: 'user', disposition: 'adopted' },
      ],
      statementCid: 'bafyprimary',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    }]))

    expect(getCause('duplicate-primary')?.planks).toEqual([
      expect.objectContaining({ id: 'primary', text: 'The primary issue.', cid: 'bafyprimary' }),
    ])
  })

  it('keeps supporting CIDs associated with the matching nonblank adopted wording', () => {
    window.localStorage.setItem('causestarter.causes.v2', JSON.stringify([{
      id: 'cid-associations',
      goal: '',
      statements: [
        { id: 'blank', text: ' ', origin: 'user', disposition: 'adopted' },
        { id: 'first', text: 'First published issue.', origin: 'user', disposition: 'adopted' },
        { id: 'second', text: 'Second published issue.', origin: 'user', disposition: 'adopted' },
      ],
      statementCid: 'bafyfirst',
      statementCids: ['bafysecond'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    }]))

    expect(getCause('cid-associations')?.planks).toEqual([
      expect.objectContaining({ id: 'first', text: 'First published issue.', cid: 'bafyfirst' }),
      expect.objectContaining({ id: 'second', text: 'Second published issue.', cid: 'bafysecond' }),
    ])
  })

  it('recovers unmigrated v2 causes even when v3 storage already exists', () => {
    const current = createCause('Already migrated')
    updateCause(current.id, { title: 'Already migrated' })
    window.localStorage.setItem('causestarter.causes.v2', JSON.stringify([{
      id: 'remaining-v2',
      goal: 'A remaining old cause.',
      statements: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    }]))

    expect(listCauses().map((cause) => cause.id)).toEqual(
      expect.arrayContaining([current.id, 'remaining-v2']),
    )
    expect(window.localStorage.getItem('causestarter.causes.v2')).toBeNull()
  })

  it('migrates v1 causes directly to v3 without losing published wording', () => {
    window.localStorage.setItem('causestarter.causes.v1', JSON.stringify([{
      id: 'legacy-cause',
      name: 'Legacy name',
      audience: 'night-shift workers',
      foundingStatement: 'Safe late-night transit exists.',
      statementCid: 'bafylegacy',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
    }]))

    const migrated = getCause('legacy-cause')!
    expect(migrated.planks).toEqual([
      expect.objectContaining({ text: 'Safe late-night transit exists.', cid: 'bafylegacy' }),
      expect.objectContaining({ text: 'This cause is for night-shift workers.' }),
    ])
    expect(migrated.planks[1]?.cid).toBeUndefined()
    expect(window.localStorage.getItem('causestarter.causes.v1')).toBeNull()
    expect(window.localStorage.getItem('causestarter.causes.v3')).not.toBeNull()
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

  it('bookmarks a published cause by owner and slug without creating a second row', () => {
    const remote: CauseDraft = {
      id: 'remote:0xabc:safer-nights',
      planks: [{ id: 'p1', text: 'Oak Street gets working streetlights.', origin: 'user', cid: 'bafy-one' }],
      title: 'Safer nights',
      slug: 'safer-nights',
      founderAddress: '0xAbC',
      rosterCid: 'bafy-roster',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    expect(isCauseBookmarked(remote)).toBe(false)
    const saved = bookmarkCause(remote)
    expect(saved.founderAddress).toBe('0xabc')
    expect(isCauseBookmarked(remote)).toBe(true)
    expect(findCauseByStable('0xABC', 'safer-nights')?.id).toBe(saved.id)
    expect(listCauses()).toHaveLength(1)

    const again = bookmarkCause({ ...remote, summary: 'Neighbors organizing.' })
    expect(again.id).toBe(saved.id)
    expect(listCauses()).toHaveLength(1)
    expect(getCause(saved.id)?.summary).toBe('Neighbors organizing.')
    expect(publishedBookmarkIds()).toEqual([
      { owner: '0xabc', slug: 'safer-nights' },
    ])
    unbookmarkCause(remote)
    expect(listCauses()).toHaveLength(0)
    expect(publishedBookmarkIds()).toEqual([])
  })
})
