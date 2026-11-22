import { fetchEventsComplete, padAddressAsTopic } from '../../utils/eventCacheClient.js';
import type { SDKMachinery } from '../../machinery.js';
import { cidToBytes32, type IpfsCidV1 } from '../../utils/cid-types.js';
import { foldStatementBeliefs } from '../conceptspace/folds.js';
import { fetchDecodedDirectSupportEvents } from '../conceptspace/queries/fetch.js';
import { foldStatementImageRecords } from './fold.js';
import type { ImageAdoption, MosaicSafetyYes } from './mosaic.js';

const EVENT_NAMES = [
  'ImageAdopted',
  'ImageAdoptionRevoked',
  'MosaicSafetyAttested',
  'MosaicSafetyRevoked',
] as const;

function statementImagesAddress(machinery: SDKMachinery): `0x${string}` {
  const address = machinery.contractAddresses?.statementImages;
  if (!address) {
    throw new Error('contractAddresses.statementImages is required for statement image queries');
  }
  return address;
}

/** Current adoptions and mosaic-safety yeses. Optional statementId is a bytes32 topic filter. */
export async function loadStatementImageRecords(
  machinery: SDKMachinery,
  statementId?: `0x${string}`,
): Promise<{ adoptions: ImageAdoption[]; safety: MosaicSafetyYes[] }> {
  const contractAddress = statementImagesAddress(machinery);
  const pages = await Promise.all(
    EVENT_NAMES.map((eventName) =>
      fetchEventsComplete(machinery, {
        contractAddress,
        eventName,
        topic2: statementId,
      }),
    ),
  );
  return foldStatementImageRecords(pages.flat());
}

/** Adoptions for one signer. Does not read image bytes. */
export async function loadSignerImageAdoptions(
  machinery: SDKMachinery,
  signer: `0x${string}`,
): Promise<ImageAdoption[]> {
  const contractAddress = statementImagesAddress(machinery);
  const topic1 = padAddressAsTopic(signer);
  const pages = await Promise.all(
    (['ImageAdopted', 'ImageAdoptionRevoked'] as const).map((eventName) =>
      fetchEventsComplete(machinery, { contractAddress, eventName, topic1 }),
    ),
  );
  return foldStatementImageRecords(pages.flat()).adoptions;
}

/**
 * Adoptions and safety yeses for one statement, plus current belief states.
 * Callers decide whether to render pixels. This function does not fetch them.
 */
export async function loadStatementImageWall(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
): Promise<{
  statementId: `0x${string}`;
  adoptions: ImageAdoption[];
  safety: MosaicSafetyYes[];
  beliefs: Record<string, number>;
}> {
  const statementId = cidToBytes32(statementCid);
  const [{ adoptions, safety }, events] = await Promise.all([
    loadStatementImageRecords(machinery, statementId),
    fetchDecodedDirectSupportEvents(machinery, { topic2: statementId }),
  ]);
  const beliefs: Record<string, number> = {};
  for (const [user, state] of foldStatementBeliefs(events).beliefs) {
    beliefs[user] = state;
  }
  return { statementId, adoptions, safety, beliefs };
}
