import {
  announcementForMatch,
  type SkillMatch,
  type VolunteerDiscoveryRecord,
} from '@commonality/sdk/volunteer-discovery'

export function recordLabel(record: VolunteerDiscoveryRecord): string {
  return record.kind === 'commonality.work-pledge' ? 'Offered' : 'Asked for'
}

export function matchSummary(match: SkillMatch): string {
  const offered = match.pledges.length
  const asked = match.requests.length
  return `${asked} ${asked === 1 ? 'request' : 'requests'} for ${match.skill}, ${offered} ${offered === 1 ? 'offer' : 'offers'} in your network`
}

export function copyableAnnouncement(match: SkillMatch): string {
  return announcementForMatch(match)
}
