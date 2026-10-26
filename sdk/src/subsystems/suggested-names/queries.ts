import { SuggestedNamesAbi } from '../../abis/conceptspace.js';
import type { SDKMachinery } from '../../machinery.js';
import { decodeRawEventArgs, decodedLogMeta } from '../../utils/decodeRawEvent.js';
import { fetchEvents, padAddressAsTopic } from '../../utils/eventCacheClient.js';
import { pickSuggestedDisplayName } from './folds.js';
import type { SuggestedName } from './types.js';

function isAddress(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

function decodeSuggestedName(raw: Parameters<typeof decodeRawEventArgs>[0]): SuggestedName | null {
  const args = decodeRawEventArgs(raw, SuggestedNamesAbi);
  if (!args) return null;
  const attester = args.attester;
  const accountBeingNamed = args.accountBeingNamed;
  const name = args.name;
  if (typeof attester !== 'string' || !isAddress(attester)) return null;
  if (typeof accountBeingNamed !== 'string' || !isAddress(accountBeingNamed)) return null;
  if (typeof name !== 'string') return null;
  const meta = decodedLogMeta(raw);
  return {
    attester,
    accountBeingNamed,
    name,
    blockNumber: meta.blockNumber,
    logIndex: meta.logIndex,
  };
}

/**
 * The single display suggestion for `account`, if any.
 * Returns null when the contract or event cache is not configured.
 */
export async function getSuggestedDisplayName(
  machinery: SDKMachinery,
  account: string,
): Promise<SuggestedName | null> {
  const contract = machinery.contractAddresses?.suggestedNames;
  if (!contract || !machinery.eventCacheUrl || !isAddress(account)) return null;
  const raw = await fetchEvents(machinery, {
    contractAddress: contract,
    eventName: 'NameSuggested',
    topic2: padAddressAsTopic(account),
    limit: 1000,
  });
  const events = raw
    .map(decodeSuggestedName)
    .filter((event): event is SuggestedName => event !== null);
  return pickSuggestedDisplayName(account, events);
}
