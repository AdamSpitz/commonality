import type { DisplayableDocument } from '@commonality/sdk/displayable-documents'

/**
 * Frozen compatibility corpus for cause drafts and publications created before
 * the retrieval-first authoring rollout. Keep these values literal: changing
 * production types must not silently rewrite the historical shapes under test.
 */
export const legacyCauseDrafts = {
  v1: [{
    id: 'saved-v1-cause',
    name: 'Safer Oak Street',
    audience: 'neighbors walking after dark',
    foundingStatement: 'Every Oak Street block has working streetlights by June.',
    statementCid: 'bafkreie3xdacjgjyn4vzsy3asihcck7ijfitsaqvqkngb7ajvptv7y57bm',
    createdAt: '2025-06-01T12:00:00.000Z',
    updatedAt: '2025-06-02T12:00:00.000Z',
  }],
  v2: [{
    id: 'saved-v2-cause',
    description: 'A private prompt that must remain private.',
    goal: 'Every Oak Street block has working streetlights by June.',
    statements: [
      {
        id: 'primary',
        text: 'Every Oak Street block has working streetlights by June.',
        origin: 'user',
        disposition: 'adopted',
      },
      {
        id: 'crosswalks',
        text: 'Crosswalks near Oak Street School are repainted before winter.',
        origin: 'suggested',
        disposition: 'adopted',
        rationale: 'A separately signable outcome.',
      },
      {
        id: 'unpublished',
        text: 'Add another neighborhood meeting.',
        origin: 'user',
        disposition: 'pending',
      },
    ],
    statementCid: 'bafkreie3xdacjgjyn4vzsy3asihcck7ijfitsaqvqkngb7ajvptv7y57bm',
    statementCids: ['bafkreidrvs3k2osv4hisscryc2ovct5wwgkvhcejmdgkhyag7f3rnso77a'],
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-02T12:00:00.000Z',
  }],
} as const

// Captured from an actual v1 roster block in data/ipfs. The publication is
// immutable, so this fixture also guards its exact schema independently of the
// current roster builder.
export const publishedRosterV1: DisplayableDocument = {
  content: '# Safer Oak Street\n\nNeighbors organizing for working streetlights and safer evening walks.\n\n## Issues\n- bafkreie3xdacjgjyn4vzsy3asihcck7ijfitsaqvqkngb7ajvptv7y57bm',
  extras: {
    kind: 'causestarter.roster',
    mediatorBlurb: '',
    plankCids: ['bafkreie3xdacjgjyn4vzsy3asihcck7ijfitsaqvqkngb7ajvptv7y57bm'],
    summary: 'Neighbors organizing for working streetlights and safer evening walks.',
    title: 'Safer Oak Street',
    version: 1,
  },
  format: 'markdown-restricted',
  references: [{
    cid: 'bafkreie3xdacjgjyn4vzsy3asihcck7ijfitsaqvqkngb7ajvptv7y57bm',
    label: 'plank',
  }],
}
