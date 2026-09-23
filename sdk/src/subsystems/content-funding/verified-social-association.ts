/**
 * Funding adapter for {@link VerifiedSocialAssociationLookup}.
 *
 * Confirms a hinted Twitter handle against the beneficiary registry.
 * A match is not authorization to claim escrowed funds.
 */

import { requireTwitterApiConfig, type SDKMachinery } from '../../machinery.js';
import { fetchAndFoldContentFundingState, getOwnerForCanonicalChannelId } from './queries.js';

function normalizeTwitterHandleHint(handle: string): string {
  const trimmed = handle.trim();
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

interface ResolvedTwitterChannel {
  channelId: string;
  handle?: string;
}

async function resolveTwitterChannel(
  machinery: SDKMachinery,
  handle: string,
): Promise<ResolvedTwitterChannel | null> {
  const baseUrl = requireTwitterApiConfig(machinery).platformApiBaseUrl;
  if (!baseUrl) return null;

  const response = await fetch(`${baseUrl}/resolve/channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform: 'twitter',
      handle: normalizeTwitterHandleHint(handle),
    }),
  });
  if (!response.ok) return null;

  const resolved = await response.json() as ResolvedTwitterChannel;
  return typeof resolved.channelId === 'string' ? resolved : null;
}

/** Beneficiary-registry lookup. Install this only on a deployment that funds. */
export async function lookupVerifiedTwitterAssociation(
  machinery: SDKMachinery,
  address: string,
  handleHint?: string,
): Promise<{ twitterHandle: string } | null> {
  if (!handleHint) return null;

  const contentFunding = await fetchAndFoldContentFundingState(machinery);
  if (!contentFunding) return null;

  const resolvedChannel = await resolveTwitterChannel(machinery, handleHint);
  if (!resolvedChannel?.channelId) return null;

  const owner = getOwnerForCanonicalChannelId(contentFunding.state, resolvedChannel.channelId);
  if (!owner || owner.toLowerCase() !== address.toLowerCase()) return null;

  return {
    twitterHandle: normalizeTwitterHandleHint(resolvedChannel.handle ?? handleHint),
  };
}
