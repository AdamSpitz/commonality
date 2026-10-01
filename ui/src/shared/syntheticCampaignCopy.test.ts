import { describe, expect, it } from 'vitest'
import { presentCampaignProjectDescription, presentCampaignSummary, presentCampaignTitle } from './syntheticCampaignCopy'

describe('presentCampaignSummary', () => {
  it('turns a bare campaign cause label into a readable board description', () => {
    expect(presentCampaignSummary('SYNTHETIC TESTNET CAMPAIGN cause local-food')).toBe(
      'Cause board supporting local food systems. (This is fake data created for testing.)',
    )
  })

  it('keeps the useful sentence from a labeled bridge board', () => {
    expect(presentCampaignSummary(
      'SYNTHETIC TESTNET CAMPAIGN. Common-ground board for Abortion common ground. Only the settlement statement is on this board.',
    )).toBe(
      'Common-ground board for Abortion common ground. Only the settlement statement is on this board. (This is fake data created for testing.)',
    )
  })

  it('leaves an ordinary description alone', () => {
    expect(presentCampaignSummary('A neighborhood garden network.')).toBe('A neighborhood garden network.')
  })
})

describe('presentCampaignTitle', () => {
  it('replaces a stored cause id or campaign slug with the cause name', () => {
    expect(presentCampaignTitle('local-food')).toBe('Local food systems')
    expect(presentCampaignTitle('campaign-medium-realistic-v1-local-food')).toBe('Local food systems')
    expect(presentCampaignTitle('medium-realistic-v1-schools-common-ground-left-modified')).toBe('Schools and LGBT common ground')
  })
})

describe('presentCampaignProjectDescription', () => {
  it('adds the testing note only for synthetic projects', () => {
    expect(presentCampaignProjectDescription('A project for local food systems, working on markets.', true))
      .toBe('A project for local food systems, working on markets. (This is fake data created for testing.)')
    expect(presentCampaignProjectDescription('A real garden.', false)).toBe('A real garden.')
  })
})
