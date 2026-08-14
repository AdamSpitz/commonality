import { describe, expect, it } from 'vitest'
import {
  buildDelegateOfferingDocument,
  normalizeDelegateOffering,
  parseDelegateOfferingDocument,
  previewDelegateOfferingCid,
} from './delegateOffering'

describe('delegate offering publication', () => {
  it('normalizes duplicate scopes and round-trips the role-specific document', () => {
    const offering = normalizeDelegateOffering({
      statementCids: ['bafy-one', ' bafy-one ', 'bafy-two'],
      summary: '  I review local projects.  ',
    })
    expect(offering).toEqual({
      statementCids: ['bafy-one', 'bafy-two'],
      summary: 'I review local projects.',
    })
    expect(parseDelegateOfferingDocument(buildDelegateOfferingDocument(offering))).toEqual(offering)
  })

  it('gives changed scope rosters different immutable version CIDs', () => {
    const first = previewDelegateOfferingCid({ statementCids: ['bafy-one'], summary: '' })
    const revised = previewDelegateOfferingCid({ statementCids: ['bafy-one', 'bafy-two'], summary: '' })
    expect(first).not.toBe(revised)
  })

  it('rejects documents from unrelated publication types', () => {
    const document = buildDelegateOfferingDocument({ statementCids: ['bafy-one'], summary: '' })
    expect(parseDelegateOfferingDocument({ ...document, extras: { ...document.extras, kind: 'causestarter.roster' } })).toBeNull()
  })
})
