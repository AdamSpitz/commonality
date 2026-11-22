import { describe, expect, it } from 'vitest'
import { WORK_PLEDGE_KIND, WORK_REQUEST_KIND, type VolunteerDiscoveryRecord } from '@commonality/sdk/volunteer-discovery'
import { matchSummary } from './volunteerDiscoveryCopy'

function record(kind: VolunteerDiscoveryRecord['kind']): VolunteerDiscoveryRecord {
  return {
    kind,
    author: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    skills: ['grant writing'],
    statementCid: 'bafystatement',
    note: 'note',
    cid: 'bafybeiavolunteerdiscoveryrecord000000000000000000000000' as VolunteerDiscoveryRecord['cid'],
  }
}

describe('volunteer discovery copy', () => {
  it('counts a match without adding the other tier', () => {
    expect(matchSummary({
      skill: 'grant writing',
      pledges: [record(WORK_PLEDGE_KIND)],
      requests: [record(WORK_REQUEST_KIND), record(WORK_REQUEST_KIND)],
    })).toBe('2 requests for grant writing, 1 offer in your network')
  })
})
