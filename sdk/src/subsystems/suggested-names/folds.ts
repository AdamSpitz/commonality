import type { SuggestedName } from './types.js';

function byChainOrder(a: SuggestedName, b: SuggestedName): number {
  if (a.blockNumber !== b.blockNumber) return a.blockNumber < b.blockNumber ? -1 : 1;
  return a.logIndex - b.logIndex;
}

/**
 * Every name suggested for `account`, in chain order.
 * Includes suggestions from the account itself and from other attesters.
 * Earlier suggestions stay in the list. The contract does not replace them.
 */
export function foldSuggestedNames(
  account: `0x${string}`,
  events: SuggestedName[],
): SuggestedName[] {
  const target = account.toLowerCase();
  return events
    .filter((event) => event.accountBeingNamed.toLowerCase() === target)
    .sort(byChainOrder);
}

/**
 * Names `account` suggested for itself, in chain order.
 * A suggestion counts only when the attester and the named account are the same address.
 */
export function foldSelfAttestedNames(
  account: `0x${string}`,
  events: SuggestedName[],
): SuggestedName[] {
  const target = account.toLowerCase();
  return foldSuggestedNames(account, events)
    .filter((event) => event.attester.toLowerCase() === target);
}
