import { IpfsCidV1 } from '../../utils/cid-types.js';
import { IPFSConfig } from '../../utils/ipfs.js';
import { createStatement, DisplayableDocument, publishDocument } from '../displayable-documents/displayable-document.js';

// ============================================================================
// Well-Known Statement Constants
// ============================================================================

export const CSM_MISSION_STATEMENT_TEXT = 'I think most people who currently identify as left-wing or right-wing are basically normal sane people with common-sense views who have more in common with each other than our extremely-polarized political/cultural environment implies, and I want to see this quiet middle majority recognize itself as a majority and gain more influence.';

export const CSM_MISSION_STATEMENT_SEED_REF = Object.freeze({
  collectionId: 'csm',
  groupId: 'mission',
  statementId: 'mission-statement',
});

export const CSM_MISSION_STATEMENT_CREATED_DATE = '2026-05-28T00:00:00.000Z';

/**
 * The canonical DisplayableDocument for the Common Sense Majority mission statement.
 *
 * This document intentionally matches fake-data-generation/seed-content/csm.json so
 * its well-known CID is the same CID uploaded by the seed-content deployment flow.
 */
export const CSM_MISSION_STATEMENT_DOCUMENT: DisplayableDocument = createStatement({
  content: CSM_MISSION_STATEMENT_TEXT,
  topic: 'csm',
  createdDate: CSM_MISSION_STATEMENT_CREATED_DATE,
  extras: {
    seedCollectionId: 'csm',
    seedCollectionTitle: 'Common Sense Majority',
    seedGroupId: 'mission',
    seedGroupTitle: 'Mission statement',
    seedStatementId: 'mission-statement',
    seedRole: 'mission-statement',
    seedNotes: [],
  },
});

/**
 * Well-known CID for CSM_MISSION_STATEMENT_DOCUMENT.
 *
 * To make this document fetchable from IPFS, call ensureCsmMissionStatementPublished().
 */
export const CSM_MISSION_STATEMENT_CID: IpfsCidV1 = 'bafybeihjlhptg6m37bhnrfzf3b5rj32mricws3gfwrhifbipb7pb264vw4';

export async function ensureCsmMissionStatementPublished(ipfsConfig: IPFSConfig): Promise<IpfsCidV1> {
  return publishDocument(ipfsConfig, CSM_MISSION_STATEMENT_DOCUMENT);
}
