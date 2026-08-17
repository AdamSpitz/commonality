/** Shared explainer copy for content-funding chips. */

export const FAN_CREATED_TOOLTIP =
  'This project was created by a third party. None of the money will go to anyone but the actual content creator.'

export const CONTENT_FUNDING_BADGE_TOOLTIP =
  'A content-funding project: it pays a creator for published work on a channel, rather than a general-purpose fundraiser.'

export const CHANNEL_STATE_TOOLTIPS: Record<string, string> = {
  unclaimed: 'This channel has not been claimed yet. If you are the creator, you can verify ownership and collect any funds waiting for you.',
  verified: 'The creator has verified they own this channel.',
  'creator-controlled': 'The verified creator controls this channel and its contracts.',
}

export const CONTRACT_STATUS_TOOLTIPS: Record<string, string> = {
  active: 'This content-funding round is still open.',
  successful: 'This round succeeded. The creator can receive the funds.',
  failed: 'This round ended without succeeding. Contributors can reclaim their funds.',
  vetoed: 'The creator vetoed this fan-created round, so it will not pay out to them.',
  unknown: 'The status of this round could not be determined.',
}

export const CONTENT_ITEM_CHIP_TOOLTIPS = {
  released: 'This item has been released as part of the funded batch.',
  aligned: 'Someone attested that this post is aligned with the funded cause.',
  notAligned: 'No current positive alignment attestation for this post.',
  uncovered: 'No attester has evaluated this content yet — it may be a coverage gap.',
  uncoveredHasAttestations: 'This content has attestations, but none from your trusted attesters.',
  trustedAttested: 'Someone in your trusted attester set attested this content.',
  uncoveredCount: 'How many items in this list have no attestation from your trusted attesters.',
  trustedCount: 'How many items have an attestation from someone you trust.',
  futureContent: 'This round funds promised future work, not a specific already-published post.',
  materialized: 'The creator has fulfilled this future-content round with actual published work.',
} as const
