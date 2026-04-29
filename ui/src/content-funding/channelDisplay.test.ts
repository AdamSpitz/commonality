import { describe, expect, it } from 'vitest'
import { getChannelDisplayLabels } from './channelDisplay'

describe('getChannelDisplayLabels', () => {
  it('uses API metadata before stable canonical IDs', () => {
    expect(getChannelDisplayLabels('twitter:uid:111111111', {
      displayName: 'Civic Builder',
      handle: '@civicbuilder',
    })).toEqual({
      primary: 'Civic Builder (@civicbuilder)',
      secondary: 'twitter:uid:111111111',
    })
  })

  it('uses fake-data contract metadata when resolver metadata is unavailable', () => {
    expect(getChannelDisplayLabels('youtube:channel:UCaaaaaaaaaaaaaaaaaaaaaaaa', {
      creatorDisplayName: 'Practical Policy Lab',
    })).toEqual({
      primary: 'Practical Policy Lab',
      secondary: 'youtube:channel:UCaaaaaaaaaaaaaaaaaaaaaaaa',
    })
  })

  it('falls back to canonical technical labels', () => {
    expect(getChannelDisplayLabels('substack:smartwriter')).toEqual({
      primary: 'smartwriter.substack.com',
      secondary: 'substack:smartwriter',
    })
  })
})
