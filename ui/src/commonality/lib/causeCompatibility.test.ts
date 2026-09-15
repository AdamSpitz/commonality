import { beforeEach, describe, expect, it } from 'vitest'
import { forgetUnsavedCauses, getCause, listCauses, publishedPlanks, unpublishedPlanks } from './causeStore'
import { parseRosterDocument } from './causeRoster'
import { legacyCauseDrafts, publishedRosterV1 } from './fixtures/causeCompatibility'

describe('cause publication rollout compatibility corpus', () => {
  beforeEach(() => {
    window.localStorage.clear()
    forgetUnsavedCauses()
  })

  it('opens saved v1 and v2 drafts together without losing wording or CID associations', () => {
    window.localStorage.setItem('causestarter.causes.v1', JSON.stringify(legacyCauseDrafts.v1))
    window.localStorage.setItem('causestarter.causes.v2', JSON.stringify(legacyCauseDrafts.v2))

    expect(listCauses().map((cause) => cause.id)).toEqual([
      'saved-v2-cause',
      'saved-v1-cause',
    ])

    const v1 = getCause('saved-v1-cause')!
    expect(publishedPlanks(v1)).toEqual([
      expect.objectContaining({
        text: 'Every Oak Street block has working streetlights by June.',
        cid: 'bafkreie3xdacjgjyn4vzsy3asihcck7ijfitsaqvqkngb7ajvptv7y57bm',
      }),
    ])
    expect(unpublishedPlanks(v1).map((plank) => plank.text)).toEqual([
      'This cause is for neighbors walking after dark.',
    ])

    const v2 = getCause('saved-v2-cause')!
    expect(v2.suggestionSeed).toBe('A private prompt that must remain private.')
    expect(publishedPlanks(v2).map(({ text, cid }) => ({ text, cid }))).toEqual([
      {
        text: 'Every Oak Street block has working streetlights by June.',
        cid: 'bafkreie3xdacjgjyn4vzsy3asihcck7ijfitsaqvqkngb7ajvptv7y57bm',
      },
      {
        text: 'Crosswalks near Oak Street School are repainted before winter.',
        cid: 'bafkreidrvs3k2osv4hisscryc2ovct5wwgkvhcejmdgkhyag7f3rnso77a',
      },
    ])
    expect(unpublishedPlanks(v2).map((plank) => plank.text)).toEqual([
      'Add another neighborhood meeting.',
    ])

    // A successful read migrates both old keys atomically into the current key.
    expect(window.localStorage.getItem('causestarter.causes.v1')).toBeNull()
    expect(window.localStorage.getItem('causestarter.causes.v2')).toBeNull()
    expect(JSON.parse(window.localStorage.getItem('causestarter.causes.v3')!)).toHaveLength(2)
  })

  it('continues to decode a captured immutable v1 roster publication', () => {
    expect(parseRosterDocument(publishedRosterV1)).toEqual({
      title: 'Safer Oak Street',
      summary: 'Neighbors organizing for working streetlights and safer evening walks.',
      plankCids: ['bafkreie3xdacjgjyn4vzsy3asihcck7ijfitsaqvqkngb7ajvptv7y57bm'],
      mediatorBlurb: '',
    })
  })
})
