/**
 * Fold StatementImages logs into current adoptions and mosaic-safety yeses.
 *
 * Latest log wins. A revoke clears the yes or the adoption; it is not a
 * published negative. Callers still need a current belief before tiling.
 */

import { StatementImagesAbi } from '../../abis.js';
import { decodeRawEventArgs } from '../../utils/decodeRawEvent.js';
import type { RawEventFromCache } from '../../utils/eventCacheClient.js';
import type { ImageAdoption, MosaicSafetyYes } from './mosaic.js';

const ADOPT = 'ImageAdopted';
const REVOKE_ADOPTION = 'ImageAdoptionRevoked';
const YES = 'MosaicSafetyAttested';
const REVOKE_YES = 'MosaicSafetyRevoked';

function hex(value: unknown): string {
  return String(value).toLowerCase();
}

function byChainOrder(a: RawEventFromCache, b: RawEventFromCache): number {
  const block = BigInt(a.blockNumber) - BigInt(b.blockNumber);
  if (block !== 0n) return block < 0n ? -1 : 1;
  return a.logIndex - b.logIndex;
}

export function foldStatementImageRecords(events: readonly RawEventFromCache[]): {
  adoptions: ImageAdoption[];
  safety: MosaicSafetyYes[];
} {
  const adoptions = new Map<string, ImageAdoption>();
  const safety = new Map<string, MosaicSafetyYes>();

  for (const event of [...events].sort(byChainOrder)) {
    const args = decodeRawEventArgs(event, StatementImagesAbi);
    if (!args) continue;
    if (event.eventName === ADOPT || event.eventName === REVOKE_ADOPTION) {
      const record: ImageAdoption = {
        signer: hex(args.signer),
        statementId: hex(args.statementId),
        imageId: hex(args.imageId),
        adopted: event.eventName === ADOPT,
      };
      adoptions.set(`${record.signer}:${record.statementId}:${record.imageId}`, record);
    } else if (event.eventName === YES || event.eventName === REVOKE_YES) {
      const record: MosaicSafetyYes = {
        attester: hex(args.attester),
        statementId: hex(args.statementId),
        imageId: hex(args.imageId),
        active: event.eventName === YES,
      };
      safety.set(`${record.attester}:${record.statementId}:${record.imageId}`, record);
    }
  }

  return {
    adoptions: [...adoptions.values()],
    safety: [...safety.values()],
  };
}
