/**
 * Confirms a hinted Twitter handle against BeneficiaryIdentity.
 * A match is who proved the channel, not who is paid and not permission to claim.
 */

import { BeneficiaryIdentityAbi } from '../../../abis/BeneficiaryIdentityAbi.js';
import { hashCanonicalId } from '../../content-identity/ids.js';
import { requireTwitterApiConfig, type SDKMachinery } from '../../machinery.js';
import { decodeRawEventArgs } from '../../utils/decodeRawEvent.js';
import { fetchEvents } from '../../utils/eventCacheClient.js';

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

/** Identity lookup. Install this when a BeneficiaryIdentity address is configured. */
export async function lookupVerifiedTwitterAssociation(
  machinery: SDKMachinery,
  address: string,
  handleHint?: string,
): Promise<{ twitterHandle: string } | null> {
  if (!handleHint) return null;
  const identity = machinery.contractAddresses?.beneficiaryIdentity;
  if (!identity) return null;

  const resolvedChannel = await resolveTwitterChannel(machinery, handleHint);
  if (!resolvedChannel?.channelId) return null;

  const beneficiaryId = hashCanonicalId(resolvedChannel.channelId);
  const events = await fetchEvents(machinery, {
    eventName: 'BeneficiaryClaimed',
    contractAddress: identity,
    topic1: beneficiaryId,
  });

  let owner: string | undefined;
  for (const raw of events) {
    const args = decodeRawEventArgs(raw, BeneficiaryIdentityAbi);
    if (!args) continue;
    if (String(args.beneficiaryId).toLowerCase() !== beneficiaryId.toLowerCase()) continue;
    owner = String(args.owner);
  }
  if (!owner || owner.toLowerCase() !== address.toLowerCase()) return null;

  return {
    twitterHandle: normalizeTwitterHandleHint(resolvedChannel.handle ?? handleHint),
  };
}
