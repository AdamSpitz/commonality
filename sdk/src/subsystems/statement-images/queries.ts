import { fetchEvents } from '../../utils/eventCacheClient.js';
import type { SDKMachinery } from '../../machinery.js';
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
      fetchEvents(machinery, {
        contractAddress,
        eventName,
        topic2: statementId,
      }),
    ),
  );
  return foldStatementImageRecords(pages.flat());
}
