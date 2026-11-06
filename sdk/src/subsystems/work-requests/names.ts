/** Mutable-ref prefixes for fundable-work requests. The colon cannot appear in a cause slug. */
export const WORK_REQUEST_REF_PREFIX = 'wr:';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertWorkSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (!SLUG.test(normalized) || normalized.length > 48) {
    throw new Error('Use a short slug of lowercase letters, numbers, and hyphens.');
  }
  return normalized;
}

export function requestRefName(slug: string): string {
  return `wr:req:${assertWorkSlug(slug)}`;
}

export function offerRefName(slug: string): string {
  return `wr:offer:${assertWorkSlug(slug)}`;
}

export function responseRefName(slug: string): string {
  return `wr:resp:${assertWorkSlug(slug)}`;
}

export function acceptanceRefName(responseOwner: string, responseSlug: string): string {
  return `wr:accept:${responseOwner.toLowerCase()}:${assertWorkSlug(responseSlug)}`;
}

export function decisionRefName(
  offerOwner: string,
  offerSlug: string,
  responseOwner: string,
  responseSlug: string,
): string {
  return `wr:decide:${offerOwner.toLowerCase()}:${assertWorkSlug(offerSlug)}:${responseOwner.toLowerCase()}:${assertWorkSlug(responseSlug)}`;
}

export function contributionLinkRefName(slug: string): string {
  return `wr:link:${assertWorkSlug(slug)}`;
}

export type WorkRefKind = 'request' | 'offer' | 'response' | 'acceptance' | 'decision' | 'contribution-link';

export function classifyWorkRefName(name: string): WorkRefKind | null {
  if (name.startsWith('wr:req:')) return 'request';
  if (name.startsWith('wr:offer:')) return 'offer';
  if (name.startsWith('wr:resp:')) return 'response';
  if (name.startsWith('wr:accept:')) return 'acceptance';
  if (name.startsWith('wr:decide:')) return 'decision';
  if (name.startsWith('wr:link:')) return 'contribution-link';
  return null;
}
