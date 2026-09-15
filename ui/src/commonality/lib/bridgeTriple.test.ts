import { describe, expect, it } from 'vitest'
import {
  applyPublishedCids,
  emptyTripleDraft,
  modifiedToCommonFromTriple,
  parentToModifiedFromTriple,
  textsToPublish,
  validateTripleForPublish,
} from './bridgeTriple'

describe('bridgeTriple', () => {
  it('refuses to publish without mediator name, both modifieds, parents, and common ground', () => {
    const draft = emptyTripleDraft()
    expect(validateTripleForPublish(draft)).toMatch(/mediator/i)
    draft.mediatorName = 'Ada'
    expect(validateTripleForPublish(draft)).toMatch(/modified/i)
    draft.sideA.modifiedText = 'Modified A'
    draft.sideB.modifiedText = 'Modified B'
    expect(validateTripleForPublish(draft)).toMatch(/parent/i)
    draft.sideA.parentText = 'Parent A'
    draft.sideB.parentCid = 'bafyparentb'
    expect(validateTripleForPublish(draft)).toMatch(/shared ground/i)
    draft.commonGroundText = 'Common'
    expect(validateTripleForPublish(draft)).toBeNull()
  })

  it('publishes missing texts and does not republish CIDs', () => {
    const draft = emptyTripleDraft()
    draft.sideA.parentCid = 'bafyparenta'
    draft.sideA.modifiedText = 'Modified A'
    draft.sideB.parentText = 'Parent B'
    draft.sideB.modifiedCid = 'bafymodb'
    draft.commonGroundText = 'Common'
    const texts = textsToPublish(draft)
    expect(texts.map((item) => item.key)).toEqual(['sideA.modified', 'sideB.parent', 'commonGround'])
  })

  it('nudges parent → modified, never parent → common ground', () => {
    const draft = emptyTripleDraft()
    draft.sideA.parentCid = 'bafyparenta'
    draft.sideA.modifiedCid = 'bafymoda'
    draft.sideB.parentCid = 'bafyparentb'
    draft.sideB.modifiedCid = 'bafymodb'
    draft.commonGroundCid = 'bafycommon'
    expect(parentToModifiedFromTriple(draft)).toEqual([
      { targetStatementCid: 'bafyparenta', suggestedStatementCid: 'bafymoda' },
      { targetStatementCid: 'bafyparentb', suggestedStatementCid: 'bafymodb' },
    ])
    expect(modifiedToCommonFromTriple(draft)).toEqual([
      { fromCid: 'bafymoda', toCid: 'bafycommon' },
      { fromCid: 'bafymodb', toCid: 'bafycommon' },
    ])
  })

  it('fills CIDs from a publish pass', () => {
    const next = applyPublishedCids(emptyTripleDraft(), {
      'sideA.modified': 'bafymoda',
      commonGround: 'bafycommon',
    })
    expect(next.sideA.modifiedCid).toBe('bafymoda')
    expect(next.commonGroundCid).toBe('bafycommon')
  })
})
