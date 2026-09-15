import { beforeEach, describe, expect, it } from 'vitest'
import type { CauseDraft } from './causeStore'
import {
  causeLastOpenedAt, isCauseArchived, readCauseLibrary, rememberCauseOpened,
  setCauseArchived,
} from './causeLibrary'

const cause: CauseDraft = {
  id: 'local-id',
  title: 'Neighborhood gardens',
  planks: [],
  founderAddress: '0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD',
  slug: 'gardens',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
}

describe('cause library preferences', () => {
  beforeEach(() => window.localStorage.clear())

  it('tracks stable published identities across local copies', () => {
    rememberCauseOpened(cause, '2026-03-01T00:00:00.000Z')
    setCauseArchived(cause, true)

    const anotherCopy = { ...cause, id: 'remote-copy' }
    expect(causeLastOpenedAt(anotherCopy)).toBe('2026-03-01T00:00:00.000Z')
    expect(isCauseArchived(anotherCopy)).toBe(true)
    expect(Object.keys(readCauseLibrary())).toHaveLength(1)
  })

  it('falls back to the board update time before it has been opened', () => {
    expect(causeLastOpenedAt(cause)).toBe(cause.updatedAt)
    expect(isCauseArchived(cause)).toBe(false)
  })
})
