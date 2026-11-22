import assert from 'assert';
import { WORK_PLEDGE_KIND, WORK_REQUEST_KIND, type VolunteerDiscoveryRecord } from './documents.js';
import { announcementForMatch, skillMatches, splitByTrust } from './tiers.js';

function record(kind: VolunteerDiscoveryRecord['kind'], author: string, skills: string[]): VolunteerDiscoveryRecord {
  return {
    kind,
    author,
    skills,
    statementCid: 'bafystatement',
    note: 'a note',
    cid: 'bafyrecord' as VolunteerDiscoveryRecord['cid'],
  };
}

const alice = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const bob = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

describe('volunteer discovery tiers', () => {
  it('puts trusted authors, including the viewer, in the first tier and counts them apart', () => {
    const tiers = splitByTrust(
      [
        record(WORK_PLEDGE_KIND, alice, ['grant writing']),
        record(WORK_REQUEST_KIND, bob, ['grant writing']),
      ],
      new Set([alice.toUpperCase()]),
    );
    assert.deepEqual(tiers.inNetwork.map((item) => item.author), [alice]);
    assert.deepEqual(tiers.others.map((item) => item.author), [bob]);
  });

  it('matches skills only within the records it is given', () => {
    const matches = skillMatches([
      record(WORK_PLEDGE_KIND, alice, ['grant writing', 'design']),
      record(WORK_PLEDGE_KIND, bob, ['grant writing']),
      record(WORK_REQUEST_KIND, alice, ['grant writing']),
    ]);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].skill, 'grant writing');
    assert.equal(matches[0].pledges.length, 2);
    assert.equal(matches[0].requests.length, 1);
    assert.equal(announcementForMatch(matches[0]), '1 person in this network asked for grant writing; 2 people offered it.');
  });

  it('does not match a skill that only one side named', () => {
    assert.deepEqual(skillMatches([
      record(WORK_PLEDGE_KIND, alice, ['design']),
      record(WORK_REQUEST_KIND, bob, ['grant writing']),
    ]), []);
  });
});
