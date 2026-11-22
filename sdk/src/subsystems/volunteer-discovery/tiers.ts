/**
 * Two-tier display for work-pledges and work-requests.
 *
 * Tier one is the viewer's transitive trust network (or the operator seed, when
 * the viewer has none). The viewer is always in their own tier. Headline counts
 * use tier one only. See specs/product/volunteer-discovery.md.
 */
import type { VolunteerDiscoveryRecord } from './documents.js';

export interface VolunteerDiscoveryTiers {
  inNetwork: VolunteerDiscoveryRecord[];
  others: VolunteerDiscoveryRecord[];
}

export function splitByTrust(
  records: readonly VolunteerDiscoveryRecord[],
  trustedAuthors: ReadonlySet<string>,
): VolunteerDiscoveryTiers {
  const trusted = new Set([...trustedAuthors].map((author) => author.toLowerCase()));
  const inNetwork: VolunteerDiscoveryRecord[] = [];
  const others: VolunteerDiscoveryRecord[] = [];
  for (const record of records) {
    (trusted.has(record.author.toLowerCase()) ? inNetwork : others).push(record);
  }
  return { inNetwork, others };
}

export interface SkillMatch {
  skill: string;
  pledges: VolunteerDiscoveryRecord[];
  requests: VolunteerDiscoveryRecord[];
}

/**
 * Skills named by both a pledge and a request inside one tier.
 * Matching across tiers would let an untrusted post inflate an in-network claim.
 */
export function skillMatches(records: readonly VolunteerDiscoveryRecord[]): SkillMatch[] {
  const pledges = new Map<string, VolunteerDiscoveryRecord[]>();
  const requests = new Map<string, VolunteerDiscoveryRecord[]>();
  for (const record of records) {
    const dest = record.kind === 'commonality.work-pledge' ? pledges : requests;
    for (const skill of record.skills) {
      const list = dest.get(skill) ?? [];
      list.push(record);
      dest.set(skill, list);
    }
  }
  const matches: SkillMatch[] = [];
  for (const [skill, offered] of pledges) {
    const wanted = requests.get(skill);
    if (!wanted || wanted.length === 0) continue;
    matches.push({ skill, pledges: offered, requests: wanted });
  }
  matches.sort((a, b) => a.skill.localeCompare(b.skill));
  return matches;
}

function people(count: number): string {
  return count === 1 ? '1 person' : `${count} people`;
}

/** A note the viewer can paste somewhere they already talk. Not a message we send. */
export function announcementForMatch(match: SkillMatch): string {
  const authors = (records: VolunteerDiscoveryRecord[]) => new Set(records.map((record) => record.author.toLowerCase())).size;
  return `${people(authors(match.requests))} in this network asked for ${match.skill}; ${people(authors(match.pledges))} offered it.`;
}
