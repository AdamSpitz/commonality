import { describe, expect, it } from 'vitest'
import {
  buildRosterDocument,
  formatRosterAge,
  mediatorBlurbFrom,
  normalizeSlug,
  parseCauseRouteParams,
  parseRosterDocument,
  previewRosterCid,
  renderRosterContent,
  rosterFieldsFromCause,
  stableCausePath,
  validateSlug,
} from './causeRoster'
import type { CauseDraft } from './causeStore'

function draft(partial: Partial<CauseDraft> & { planks: CauseDraft['planks'] }): CauseDraft {
  return {
    id: 'local-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('causeRoster', () => {
  it('normalizes and validates slugs', () => {
    expect(normalizeSlug('  Free the Oaks! ')).toBe('free-the-oaks')
    expect(validateSlug('free-the-oaks')).toBeNull()
    expect(validateSlug('created-statements')).toMatch(/reserved/i)
    expect(validateSlug('Bad_Slug')).toMatch(/lowercase/i)
    expect(validateSlug('')).toMatch(/slug/i)
  })

  it('builds roster fields from all founder-authored display text', () => {
    const cause = draft({
      title: 'Oak Street lights',
      summary: 'Neighbors funding streetlights.',
      mediator: {
        name: 'Oak Bridge',
        description: 'Local opt-in bridge',
        address: '0x1111111111111111111111111111111111111111',
        serviceUrl: 'https://bridge.example',
      },
      planks: [
        { id: 'a', text: 'Repair lights by June.', origin: 'user', cid: 'bafyplank1' },
        { id: 'b', text: 'Paint crosswalks.', origin: 'user', cid: 'bafyplank2' },
        { id: 'c', text: 'Unpublished idea.', origin: 'user' },
      ],
    })
    const fields = rosterFieldsFromCause(cause)
    expect(fields).toEqual({
      title: 'Oak Street lights',
      summary: 'Neighbors funding streetlights.',
      plankCids: ['bafyplank1', 'bafyplank2'],
      mediatorBlurb: 'Oak Bridge: Local opt-in bridge',
    })
  })

  it('falls back to the first published plank for title', () => {
    const cause = draft({
      planks: [
        { id: 'a', text: 'Repair lights by June.', origin: 'user', cid: 'bafyplank1' },
      ],
    })
    expect(rosterFieldsFromCause(cause).title).toBe('Repair lights by June.')
  })

  it('embeds structured fields in a displayable document and round-trips', () => {
    const fields = {
      title: 'Oak Street lights',
      summary: 'Neighbors funding streetlights.',
      plankCids: ['bafyplank1', 'bafyplank2'],
      mediatorBlurb: 'Oak Bridge: Local opt-in bridge',
    }
    const doc = buildRosterDocument(fields)
    expect(doc.format).toBe('markdown-restricted')
    expect(doc.content).toContain('# Oak Street lights')
    expect(doc.references?.map((r) => r.cid)).toEqual(['bafyplank1', 'bafyplank2'])
    expect(parseRosterDocument(doc)).toEqual(fields)
    expect(previewRosterCid(fields)).toMatch(/^bafkrei/)
    // Same bytes → same CID
    expect(previewRosterCid(fields)).toBe(previewRosterCid(fields))
  })

  it('voids preview CID when any founder display field changes', () => {
    const base = {
      title: 'A',
      summary: 'B',
      plankCids: ['bafy1'],
      mediatorBlurb: 'C',
    }
    const cid = previewRosterCid(base)
    expect(previewRosterCid({ ...base, title: 'A2' })).not.toBe(cid)
    expect(previewRosterCid({ ...base, summary: 'B2' })).not.toBe(cid)
    expect(previewRosterCid({ ...base, plankCids: ['bafy1', 'bafy2'] })).not.toBe(cid)
    expect(previewRosterCid({ ...base, mediatorBlurb: 'C2' })).not.toBe(cid)
  })

  it('parses stable routes with optional version pin', () => {
    const owner = '0xAbCdEf0123456789AbCdEf0123456789AbCdEf01'
    expect(parseCauseRouteParams(owner, 'oak-street')).toEqual({
      owner: owner.toLowerCase(),
      slug: 'oak-street',
      versionCid: undefined,
    })
    expect(parseCauseRouteParams(owner, 'oak-street@bafkreiversion')).toEqual({
      owner: owner.toLowerCase(),
      slug: 'oak-street',
      versionCid: 'bafkreiversion',
    })
    expect(parseCauseRouteParams('not-an-address', 'oak-street')).toBeNull()
    expect(stableCausePath({
      owner: owner.toLowerCase() as `0x${string}`,
      slug: 'oak-street',
    }, 'bafkreiversion')).toBe(
      `/cause/${owner.toLowerCase()}/oak-street@bafkreiversion`,
    )
  })

  it('formats roster ages for history copy', () => {
    const now = Date.parse('2026-08-10T12:00:00.000Z')
    expect(formatRosterAge('2026-08-10T11:59:30.000Z', now)).toBe('just now')
    expect(formatRosterAge('2026-08-07T12:00:00.000Z', now)).toBe('3 days ago')
  })

  it('renders mediator blurb from name and description only', () => {
    expect(mediatorBlurbFrom(undefined)).toBe('')
    expect(mediatorBlurbFrom({
      name: 'Bridge',
      description: 'Helps neighbors opt in',
      address: '0x1',
      serviceUrl: 'https://x.test',
    })).toBe('Bridge: Helps neighbors opt in')
  })

  it('keeps plank order in rendered content', () => {
    const content = renderRosterContent({
      title: 'T',
      summary: '',
      plankCids: ['cid-a', 'cid-b'],
      mediatorBlurb: '',
    })
    expect(content.indexOf('cid-a')).toBeLessThan(content.indexOf('cid-b'))
  })
})
